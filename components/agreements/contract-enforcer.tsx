"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Contract } from "@/lib/db/schema";
import { getMissingContracts } from "@/lib/actions/agreements";
import { ForceContractSignature } from "./force-contract-signature";

interface ContractEnforcerProps {
  userId: string;
  initialPendingContracts?: Contract[];
}

export function ContractEnforcer({
  userId,
  initialPendingContracts,
}: ContractEnforcerProps) {
  const pathname = usePathname();
  const [pendingContracts, setPendingContracts] = useState<Contract[]>(
    initialPendingContracts || []
  );
  const [isChecking, setIsChecking] = useState(!initialPendingContracts);

  useEffect(() => {
    let isMounted = true;

    async function checkContracts() {
      if (!userId) return;
      try {
        const missing = await getMissingContracts(userId);
        if (isMounted) {
          setPendingContracts(missing);
        }
      } catch (err) {
        console.error("Sözleşme kontrolü hatası:", err);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    }

    if (!initialPendingContracts) {
      checkContracts();
    } else {
      setPendingContracts(initialPendingContracts);
      setIsChecking(false);
    }

    return () => {
      isMounted = false;
    };
  }, [userId, initialPendingContracts, pathname]);

  // Eğer admin sözleşme yönetimi ekranındaysa kilitlenmesin
  if (pathname.startsWith("/admin/agreements")) {
    return null;
  }

  // Henüz kontrol ediliyorsa veya onay bekleyen sözleşme yoksa hiçbir şey gösterme
  if (isChecking || !pendingContracts || pendingContracts.length === 0) {
    return null;
  }

  // Kapatılamaz tam ekran zorunlu onay paneli
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-4 py-8">
        <ForceContractSignature
          userId={userId}
          pendingContracts={pendingContracts}
          onSignedSuccess={() => setPendingContracts([])}
        />
      </div>
    </div>
  );
}
