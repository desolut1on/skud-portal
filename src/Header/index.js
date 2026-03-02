import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';

export default function Header() {
  return (
    <header style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px'
    }}>
      <LanguageSwitcher />
      <UserAvatar />
    </header>
  );
}