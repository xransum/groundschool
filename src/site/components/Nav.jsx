import { NavLink } from 'react-router-dom';

export default function Nav() {
  const linkStyle = ({ isActive }) => ({
    color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
    fontWeight: isActive ? '600' : '400',
    textDecoration: 'none',
    fontSize: '0.9rem',
    padding: '6px 0',
    borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  });

  return (
    <nav
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-surface-2)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="max-w-2xl mx-auto px-4 flex items-center justify-between"
        style={{ height: 52 }}
      >
        <span className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
          Groundschool
        </span>
        <div className="flex gap-6">
          <NavLink to="/" end style={linkStyle}>Written Test</NavLink>
          <NavLink to="/oral" style={linkStyle}>Oral Exam</NavLink>
        </div>
      </div>
    </nav>
  );
}
