"use client";

import { useState } from "react";
import { createContractVersion } from "@/lib/actions/agreements";
import { PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateContractForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const formData = new FormData(formEl);

    const type = formData.get("type") as any;
    const title = (formData.get("title") as string)?.trim();
    const version = (formData.get("version") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();

    if (!title || !version || !content) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }

    const confirmSubmit = window.confirm(
      `"${title}" (v${version}) versiyonunu yayına almak istediğinize emin misiniz?\n\nBu işlem yapıldığında, kullanıcılar sisteme ilk girdiklerinde bu yeni sözleşmeyi onaylamak zorunda kalacaktır.`
    );
    if (!confirmSubmit) return;

    setLoading(true);
    try {
      const res = await createContractVersion({
        type,
        title,
        version,
        content,
      });

      if (res.success) {
        toast.success(res.message || "Yeni sözleşme versiyonu başarıyla yayınlandı! 📋");
        formEl.reset();
        router.refresh();
      } else {
        toast.error(res.message || "Sözleşme oluşturulamadı.");
      }
    } catch (err: any) {
      console.error("Sözleşme kaydetme hatası:", err);
      toast.error("Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
      {/* Sözleşme Tipi */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Sözleşme Tipi
        </label>
        <select
          name="type"
          required
          defaultValue="KVKK"
          className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer"
        >
          <option value="KVKK">KVKK ve Kişisel Veri Politikası</option>
          <option value="USER_AGREEMENT">Kullanıcı & Gezgin Sözleşmesi</option>
          <option value="PRIVACY_POLICY">Gizlilik ve Çerez Politikası</option>
          <option value="OTHER">Diğer Yasal Bildirimler</option>
        </select>
      </div>

      {/* Başlık */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Sözleşme Başlığı
        </label>
        <input
          name="title"
          required
          placeholder="Örn: TatildeBugün KVKK Aydınlatma Metni"
          className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* Versiyon */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Versiyon Kodu
        </label>
        <input
          name="version"
          required
          placeholder="Örn: 1.1.0 veya 2026-Kasım"
          className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* İçerik */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Sözleşme Metni (İçerik)
        </label>
        <textarea
          name="content"
          required
          rows={7}
          placeholder="Yasal sözleşme veya aydınlatma metnini buraya yapıştırın..."
          className="w-full text-xs sm:text-sm bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y leading-relaxed min-h-[140px]"
        />
      </div>

      {/* Bilgilendirme Kutusu */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs leading-relaxed">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Yeni versiyon yayınlandığında, bu tipteki eski sözleşmeler arşive alınır ve tüm kullanıcılar sisteme ilk girdiklerinde yeni metni onaylamak zorunda kalır.
        </span>
      </div>

      {/* Gönder Butonu */}
      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[48px] bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Yayınlanıyor...</span>
          </>
        ) : (
          <>
            <PlusCircle className="w-4 h-4" />
            <span>Yeni Versiyonu Yayına Al</span>
          </>
        )}
      </button>
    </form>
  );
}
