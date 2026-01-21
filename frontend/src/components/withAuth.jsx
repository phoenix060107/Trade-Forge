import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const withAuth = (Component) => (props) => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('JWT');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return localStorage.getItem('JWT') ? <Component {...props} /> : <div>Loading...</div>;
};

export default withAuth;
