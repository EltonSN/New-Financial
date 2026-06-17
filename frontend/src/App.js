import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CardsPage from './pages/CardsPage';
import SettingsPage from './pages/SettingsPage';
import ApiService from './services/ApiService';
import './App.css';

// Lista de imagens disponíveis na pasta public/background
const backgroundImages = ['op2.jpg', 'op3.jpg'];

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    loadInitialData();

    // Alterado para 5 segundos provisoriamente para você ver funcionando.
    // Para 10 minutos depois volte para: 10 * 60 * 1000
    const bgInterval = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);

    return () => clearInterval(bgInterval);
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesData, cardsData] = await Promise.all([
        ApiService.getCategories(),
        ApiService.getCards(),
      ]);
      setCategories(categoriesData);
      setCards(cardsData);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'transactions':
        return <TransactionsPage categories={categories} />;
      case 'cards':
        return <CardsPage cards={cards} />;
      case 'settings':
        return <SettingsPage onDataUpdate={loadInitialData} />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-layout">
      {/* Camadas de background para transição suave (Crossfade) */}
      {backgroundImages.map((img, index) => (
        <div
          key={img}
          className={`app-background ${index === currentBgIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url('/background/${img}')` }}
        />
      ))}

      {/* Sidebar - Desktop and Mobile */}
      <Sidebar 
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <div className="page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;