import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/Toast/ToastProvider';
import './register.css';

export default function Register() {
  const { register: reg } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [sterilizationNumber, setSterilizationNumber] = useState('');
  const [err, setErr] = useState('');
  const { show } = useToast();

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await reg({ email, password, name, employeeId, sterilizationNumber });
      show('Account created!', { tone: 'ok' });
      nav('/');
    } catch (e) {
      setErr(String(e.message || e));
      show(e.message || 'Registration failed', { tone: 'danger', ms: 5000 });
    }
  }

  return (
    <div className="reg__wrap">
      <h1>Create account</h1>

      {err && <div className="reg__err">{err}</div>}

      <form onSubmit={onSubmit} className="reg__form">
        <input
          className="reg__input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="reg__input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="reg__input"
          placeholder="Password (min 6)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="reg__input"
          placeholder="Employee ID"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        />
        <input
          className="reg__input"
          placeholder="Sterilization Number"
          value={sterilizationNumber}
          onChange={(e) => setSterilizationNumber(e.target.value)}
        />
        <button className="reg__btn">Register</button>
      </form>

      <div className="reg__footer">
        Have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}
