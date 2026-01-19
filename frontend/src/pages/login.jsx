import axios from 'axios';
import { useState } from 'react';
import { useRouter } from 'next/router';

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(process.env.NEXT_PUBLIC_API_URL + '/auth/login', {
        email,
        password
      });
      const token = response.data;
      localStorage.setItem('JWT', token);
      router.push('/dashboard');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <form onSubmit={handleSubmit}>
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
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
      <p>Don't have an account?{' '}
        <a href="/register">Register</a>
      </p>
    </div>
  );
};

export default Login;
