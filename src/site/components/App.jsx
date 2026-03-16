import { Routes, Route } from 'react-router-dom';
import Nav from './Nav.jsx';
import QuizMode from './QuizMode.jsx';
import OralPrepMode from './OralPrepMode.jsx';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<QuizMode />} />
          <Route path="/oral" element={<OralPrepMode />} />
        </Routes>
      </main>
      <footer
        className="text-center text-xs py-4"
        style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-surface-2)' }}
      >
        Groundschool -- Free FAA PPL Study Tool.
        Question data sourced from U.S. Government public domain materials.
      </footer>
    </div>
  );
}
