import React, { useState } from 'react';
import Sidebar from '../components/plant/Sidebar';
import Topbar from '../components/plant/Topbar';
import FocusCards from '../components/plant/FocusCards';
import SLAAgingStrip from '../components/plant/SLAAgingStrip';
import OrderTable from '../components/plant/OrderTable';
import BreakInLogger from '../components/plant/BreakInLogger';
import WorkCalendar from '../components/plant/WorkCalendar';
import PMAnalytics from '../components/plant/PMAnalytics';
import ItemMasterPage from '../components/plant/ItemMasterPage';
import SystemRegistryPage from '../components/plant/SystemRegistryPage';
import ShiftHandoverPage from '../components/plant/ShiftHandoverPage';
import NotificationCenter from '../components/plant/NotificationCenter';

export default function PlantDesk() {
  const [activeTab, setActiveTab] = useState('focus');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);

  // Function para mag-render ng babagay na pahina batay sa napiling tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'focus':
        return (
          <div className="space-y-6">
            <FocusCards orders={orders} onCardClick={(id) => console.log(id)} />
            <SLAAgingStrip orders={orders} />
            <OrderTable orders={orders} setOrders={setOrders} />
          </div>
        );
      case 'orders':
        return <OrderTable orders={orders} setOrders={setOrders} />;
      case 'breakin':
        return <BreakInLogger orders={orders} setOrders={setOrders} />;
      case 'calendar':
        return <WorkCalendar orders={orders} />;
      case 'analytics':
        return <PMAnalytics orders={orders} />;
      case 'itemmaster':
        return <ItemMasterPage />;
      case 'registry':
        return <SystemRegistryPage />;
      case 'handover':
        return <ShiftHandoverPage />;
      default:
        return (
          <div className="space-y-6">
            <FocusCards orders={orders} />
            <OrderTable orders={orders} setOrders={setOrders} />
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* 1. Sidebar Component (May Mobile Open/Close controls) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 2. Right Side Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar na may Hamburger Menu Button */}
        <Topbar
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {/* Dynamic Page Workspace */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}
