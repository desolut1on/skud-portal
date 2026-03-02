import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUserRole = useCallback(async (email) => {
    try {
      const rolesDoc = await getDoc(doc(db, 'system', 'roles'));
      if (!rolesDoc.exists()) return 'employee';

      const roles = rolesDoc.data();
      
      if (roles.admin.includes(email)) return 'admin';
      if (roles.operators.includes(email)) return 'operator';
      
      return 'employee';
    } catch (error) {
      console.error('Error checking user role:', error);
      return 'employee';
    }
  }, []);

  const loadUserData = useCallback(async (user) => {
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const role = await checkUserRole(user.email);
      const isApproved = role === 'admin' || role === 'operator';

      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role,
          approved: isApproved,
          createdAt: serverTimestamp()
        });

        if (!isApproved) {
          await setDoc(doc(db, 'registration_requests', user.uid), {
            email: user.email,
            status: 'pending',
            createdAt: serverTimestamp(),
            userId: user.uid
          });
        }
      }

      return {
        uid: user.uid,
        email: user.email,
        ...(userDoc.exists() ? userDoc.data() : { role, approved: isApproved }),
        isAdmin: role === 'admin',
        isOperator: role === 'operator',
        isEmployee: role === 'employee'
      };
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }, [checkUserRole]);

  const register = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = await loadUserData(userCredential.user);
      
      await updateDoc(doc(db, 'users', user.uid), {
        name: name
      });
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw handleAuthError(error);
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = await loadUserData(userCredential.user);

      if (!user) throw new Error('User data not found');
      if (!user.approved && !user.isAdmin && !user.isOperator) {
        await signOut(auth);
        throw new Error('Account not approved by administrator');
      }

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw handleAuthError(error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw handleAuthError(error);
    }
  };

  // Новая функция для повторного одобрения заявки
  const reapproveRequest = async (requestId) => {
    try {
      const batch = writeBatch(db);
      
      const requestRef = doc(db, 'guest_requests', requestId);
      batch.update(requestRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null
      });

      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data();

      // Создаем запись в СКУД
      const skudRef = doc(collection(db, 'skud_registrations'));
      batch.set(skudRef, {
        fullName: requestData.fullName,
        docType: requestData.docType,
        docNumber: requestData.docNumber,
        email: requestData.email,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        accessType: 'Гостевой пропуск',
        note: 'Создан через систему заявок (повторное одобрение)',
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        privacyConsent: requestData.agreeToTerms,
        privacyConsentDate: serverTimestamp()
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error reapproving request:', error);
      throw error;
    }
  };

  const createGuestPass = async (passData) => {
    try {
      const passRef = await addDoc(collection(db, 'guest_passes'), {
        ...passData,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      return passRef.id;
    } catch (error) {
      console.error('Error creating guest pass:', error);
      throw error;
    }
  };

  const getEmployeePasses = async (userId) => {
    try {
      const q = query(
        collection(db, 'guest_passes'),
        where('createdBy', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error fetching employee passes:', error);
      throw error;
    }
  };

  const approveRegistration = async (requestId) => {
    try {
      const requestDoc = await getDoc(doc(db, 'registration_requests', requestId));
      if (!requestDoc.exists()) throw new Error('Request not found');

      const { userId } = requestDoc.data();
      await updateDoc(doc(db, 'users', userId), {
        approved: true
      });
      await updateDoc(doc(db, 'registration_requests', requestId), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  };

  const handleAuthError = (error) => {
    const errorMap = {
      'auth/user-not-found': 'Пользователь не найден',
      'auth/wrong-password': 'Неверный пароль',
      'auth/email-already-in-use': 'Email уже используется',
      'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже',
      'auth/invalid-email': 'Некорректный email',
      'auth/weak-password': 'Пароль должен быть не менее 6 символов'
    };

    return new Error(errorMap[error.code] || error.message || 'Ошибка аутентификации');
  };

  const initializeSystem = useCallback(async () => {
    try {
      const rolesRef = doc(db, 'system', 'roles');
      const rolesDoc = await getDoc(rolesRef);
      
      if (!rolesDoc.exists()) {
        await setDoc(rolesRef, {
          admin: ['admin@example.com'],
          operators: ['operator@example.com'],
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('System initialization error:', error);
    }
  }, []);

  useEffect(() => {
    initializeSystem();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const userData = await loadUserData(user);
      setCurrentUser(userData);
      setLoading(false);
    });

    return unsubscribe;
  }, [initializeSystem, loadUserData]);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    resetPassword,
    createGuestPass,
    getEmployeePasses,
    approveRegistration,
    reapproveRequest, // Добавляем новую функцию в контекст
    isAdmin: currentUser?.isAdmin,
    isOperator: currentUser?.isOperator,
    isEmployee: currentUser?.isEmployee,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};