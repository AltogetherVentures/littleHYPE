import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { Shop } from './pages/Shop';
import { Story } from './pages/Story';
import { Community } from './pages/Community';
import { Brand } from './pages/Brand';
import { ChatBot } from './components/ChatBot';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Shop />} />
        <Route path="/story" element={<Story />} />
        <Route path="/community" element={<Community />} />
        <Route path="/brand" element={<Brand />} />
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
      <ChatBot />
    </HashRouter>
  );
};

export default App;