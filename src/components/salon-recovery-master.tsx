"use client";

import React from "react";
import HomeView from "@/components/views/home-view";
import SimulatorView from "@/components/views/simulator-view";
import AdminWorkspace from "@/components/admin/admin-workspace";
import PricingView from "@/components/views/pricing-view";
import SettingsView from "@/components/views/settings-view";
import TenantLabView from "@/components/views/tenant-lab-view";
import ConsultationModal from "@/components/modals/consultation-modal";
import MorningBriefModal from "@/components/modals/morning-brief-modal";
import { useSalon } from "@/context/salon-context";
import { ViewTab } from "@/types/salon";

export default function SalonRecoveryMaster({ initialTab }: { initialTab?: ViewTab }) {
  const {
    activeTab,
    setActiveTab,
    consultationModalOpen,
    setConsultationModalOpen,
    selectedPlanForConsultation,
    morningBriefOpen,
    setMorningBriefOpen,
    toastMessage,
  } = useSalon();

  // Route-provided tab wins on first paint so the right page is server-rendered,
  // then in-app navigation controls the active tab.
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, setActiveTab]);
  const view = hydrated ? activeTab : initialTab ?? activeTab;

  return (
    <div className="relative min-h-[60vh] text-slate-800 dark:text-slate-100 selection:bg-[#1CA830]/20 selection:text-[#1CA830]">
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-slate-700 bg-[#052767] p-3.5 text-xs font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
        >
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#1CA830]" />
          {toastMessage}
        </div>
      )}

      {view === "home" && <HomeView />}
      {view === "simulator" && <SimulatorView />}
      {view === "dashboard" && <AdminWorkspace demoMode />}
      {view === "pricing" && <PricingView />}
      {view === "settings" && <SettingsView />}
      {view === "tenant-lab" && <TenantLabView />}

      <ConsultationModal
        isOpen={consultationModalOpen}
        onClose={() => setConsultationModalOpen(false)}
        selectedPlanName={selectedPlanForConsultation}
      />
      <MorningBriefModal
        isOpen={morningBriefOpen}
        onClose={() => setMorningBriefOpen(false)}
      />
    </div>
  );
}
