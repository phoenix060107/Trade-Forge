import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useRouter } from 'next/router';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState({ assets: [] });
  const [marketPrices, setMarketPrices] = useState({});
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const authMeResponse = await axios.get('/api/auth/me');
        setUser(authMeResponse.data);

        if (!user) {
          router.push('/login');
          return;
        }

        const portfolioResponse = await axios.get('/api/portfolio');
        setPortfolio(portfolioResponse.data);

        const marketPricesResponse = await axios.get('/api/market/prices?symbols=BTC,ETH,SOL');
        setMarketPrices(marketPricesResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user, router]);

  const assets = portfolio.assets || [];
  const chartData = assets.map(asset => ({
    name: asset.symbol,
    price: marketPrices[asset.symbol]?.price || 0,
    change_24h: marketPrices[asset.symbol]?.change_24h || 0
  }));

  return (
    <div className="p-6 dark:bg-gray-900">
      {!user ? (
        <div>Please log in</div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-4">Welcome, {user.username}!</h1>
          <p>Your balance is: ${user.balance_usd}</p>
          <div className="mt-6">
            <LineChart width={730} height={250} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="change_24h" stroke="#82ca9d" />
            </LineChart>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
