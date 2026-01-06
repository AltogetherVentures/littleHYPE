
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ProductDetail } from './pages/ProductDetail';
import { Shop } from './pages/Shop';
import { Story } from './pages/Story';
import { Community } from './pages/Community';
import { Brand } from './pages/Brand';
import { SpaceLog } from './pages/SpaceLog';
import { Moments } from './pages/Moments';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { ChatBot } from './components/ChatBot';
import { ScrollToTop } from './components/ScrollToTop';

const App: React.FC = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Shop />} />
        <Route path="/story" element={<Story />} />
        <Route path="/community" element={<Community />} />
        <Route path="/brand" element={<Brand />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        {/* Specific Product Routes */}
        <Route path="/product/space-log" element={<SpaceLog />} />
        <Route path="/product/moments" element={<Moments />} />
        {/* Generic Product Route */}
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
      <ChatBot />
    </HashRouter>
  );
};

export default App;
