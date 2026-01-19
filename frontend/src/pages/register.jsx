import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/router';

const Register = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(process.env.NEXT_PUBLIC_API_URL + '/auth/register', {
        username,
        email,
        password
      });
      const token = response.data;
      localStorage.setItem('JWT', token);
      router.push('/login');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="block w-full p-2 mt-2 border-gray-400 focus:border-blue-600 focus:ring-blue-500"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="block w-full p-2 mt-2 border-gray-400 focus:border-blue-600 focus:ring-blue-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="block w-full p-2 mt-2 border-gray-400 focus:border-blue-600 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 mt-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-blue-500"
        >
          {loading ? 'Loading...' : 'Register'}
        </button>
      </form>
      <p>Already have an account?{' '}
        <a href="/login">Login</a>
      </p>
    </div>
  );
};

export default Register;
