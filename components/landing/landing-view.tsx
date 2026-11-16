"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Palmtree,
  Compass,
  Globe2,
  Radar,
  Luggage,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Users,
  MapPin,
  CheckCircle2,
  Languages,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function LandingView() {
  const { locale, setLanguage, t } = useTranslation();
  const isEn = locale === "en";

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-white relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      {/* Arka Plan Dekoratif Ambient Işıklar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-gradient-to-b from-cyan-600/15 via-teal-500/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 -right-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Üst Menü / Navbar */}
      <header className="relative z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          {/* Logo & Marka */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-200">
              <Palmtree className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                All<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">TripX</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 -mt-1 hidden sm:block">
                Global Travel Network
              </span>
            </div>
          </Link>

          {/* Dil Seçici & Giriş Butonları */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dil Değiştirici Buton Grubu */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-full p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all min-h-[36px] ${
                  isEn
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="Switch to English"
              >
                <span>🇬🇧</span>
                <span className="hidden sm:inline">EN</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage("tr")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all min-h-[36px] ${
                  !isEn
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-label="Türkçe'ye Geç"
              >
                <span>🇹🇷</span>
                <span className="hidden sm:inline">TR</span>
              </button>
            </div>

            {/* Giriş Yap */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 transition-all min-h-[44px]"
            >
              <span>{isEn ? "Sign In" : "Giriş Yap"}</span>
            </Link>

            {/* Kayıt Ol */}
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:opacity-95 shadow-md shadow-cyan-500/20 transition-all min-h-[44px]"
            >
              <span>{isEn ? "Join Free" : "Ücretsiz Katıl"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Bölümü */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-20 max-w-5xl mx-auto w-full">
        {/* Canlı Rozet */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs sm:text-sm font-semibold mb-8 backdrop-blur-md shadow-lg shadow-cyan-500/5 animate-pulse">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>
            {isEn
              ? "The Global Network for Modern Travelers & Explorers"
              : "Modern Gezginler ve Seyahat Severlerin Küresel Ağı"}
          </span>
        </div>

        {/* Ana Başlık */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] text-white">
          {isEn ? (
            <>
              Map Your World.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
                Match Your Routes.
              </span>
            </>
          ) : (
            <>
              Dünyanı Haritala.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
                Rotalarını Eşleştir.
              </span>
            </>
          )}
        </h1>

        {/* Alt Metin */}
        <p className="mt-6 sm:mt-8 text-base sm:text-xl text-slate-400 max-w-3xl leading-relaxed">
          {isEn
            ? "Pin visited countries and cities on your personal world map, chart upcoming travel itineraries, and discover fellow explorers heading to the same destinations at the exact same dates."
            : "Ziyaret ettiğin ülkeleri ve şehirleri interaktif dünya haritanda renklendir, gelecek tatil rotalarını çiz ve aynı tarihlerde aynı şehirlere seyahat eden gezginlerle anında tanış."}
        </p>

        {/* Çağrı Butonları (Call to Action) */}
        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full max-w-md">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 hover:brightness-110 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 min-h-[52px]"
          >
            <span>{isEn ? "Create Your Free Map" : "Ücretsiz Haritanı Oluştur"}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 shadow-lg transition-all min-h-[52px]"
          >
            <span>{isEn ? "Explore Demo" : "Giriş Yap & Keşfet"}</span>
          </Link>
        </div>

        {/* Canlı İstatistik Rozetleri */}
        <div className="mt-14 sm:mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-slate-400 text-xs sm:text-sm border-t border-b border-white/5 py-6 w-full">
          <div className="flex items-center gap-2.5">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <span>
              <strong className="text-white font-bold">195</strong> {isEn ? "Countries Supported" : "Ülke Destekleniyor"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Radar className="w-5 h-5 text-teal-400" />
            <span>
              <strong className="text-white font-bold">{isEn ? "Live" : "Canlı"}</strong> {isEn ? "Route Radar" : "Rota Radarı"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>
              <strong className="text-white font-bold">100%</strong> {isEn ? "Privacy Controlled" : "Kullanıcı Gizliliği"}
            </span>
          </div>
        </div>
      </section>

      {/* 4 Temel Yetenek / Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full">
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4 border border-cyan-500/20">
            <Compass className="w-3.5 h-3.5" />
            {isEn ? "Designed for Explorers" : "Gezginler İçin Özel Tasarlandı"}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            {isEn
              ? "Everything You Need to Document & Share Your Journeys"
              : "Seyahatlerini Belgelemek ve Paylaşmak İçin Gereken Her Şey"}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400">
            {isEn
              ? "AllTripX combines interactive world mapping with smart route matching, giving travelers a personalized digital passport."
              : "AllTripX interaktif dünya haritasını akıllı rota eşleştirme motoruyla birleştirerek her gezgine kişiselleştirilmiş dijital bir pasaport sunar."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. İnteraktif Harita */}
          <div className="group p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {isEn ? "Interactive World Map" : "İnteraktif Dünya Haritası"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 flex-1">
              {isEn
                ? "Color-code countries and cities you have visited. Calculate your global exploration percentage and keep track of all your stops."
                : "Gezdiğin ülke ve şehirleri haritanda işaretle. Dünyanın yüzde kaçını keşfettiğini gör ve ziyaret geçmişini dijital pasaportunda topla."}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <span>{isEn ? "Digital Passport" : "Dijital Pasaport"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 2. Rota Radarı */}
          <div className="group p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/5 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 group-hover:scale-110 transition-transform">
              <Radar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {isEn ? "Smart Route Radar" : "Akıllı Rota Radarı"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 flex-1">
              {isEn
                ? "Automatically match with other travelers when your travel dates and cities overlap. Grab coffee in Paris or explore Tokyo together."
                : "Gelecek tatil planlarını ekle; seninle aynı tarihte aynı şehre giden gezginlerle rota çakışması anında otomatik eşleş ve haberleş."}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
              <span>{isEn ? "Real-time Matching" : "Anlık Eşleşme"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 3. Tatildeyim Canlı Modu */}
          <div className="group p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Luggage className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {isEn ? "Live Vacation Mode" : "Tatildeyim Canlı Rehber"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 flex-1">
              {isEn
                ? "Activate live travel mode during trips: discover iconic landmarks, check-in to POIs, and build a time-stamped travel journal."
                : "Seyahat esnasında tek tıkla canlı tura başla: Şehrin ikonik mekanlarını gez, check-in yap ve zaman damgalı gezi günlüğü oluştur."}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
              <span>{isEn ? "Landmark Check-ins" : "Mekan Check-in"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* 4. Gizlilik ve Rehber Eşleşmesi */}
          <div className="group p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {isEn ? "Zero-Knowledge Privacy" : "Sıfır Bilgi Gizliliği"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 flex-1">
              {isEn
                ? "Full control over your visibility: choose who sees your map (Everyone, Friends, or Private). Find contacts without saving raw numbers."
                : "Haritanı kimin göreceğini sen seç (Herkes, Arkadaşlar, Gizli). Telefon numaraları kaydedilmeden rehberdeki gezgin dostlarını bul."}
            </p>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <span>{isEn ? "Strict KVKK & GDPR" : "Tam KVKK & GDPR"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Alt Eylem Çağrısı (Bottom CTA) */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full text-center">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-tr from-cyan-950/60 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            {isEn
              ? "Ready to Pin Your First Country?"
              : "İlk Ülkeni İşaretlemeye Hazır mısın?"}
          </h3>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8">
            {isEn
              ? "Join AllTripX today and unlock your personalized interactive travel map in under 60 seconds."
              : "Bugün AllTripX'e ücretsiz katılın ve 60 saniye içinde dünya haritanızı oluşturmaya başlayın."}
          </p>

          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-base font-extrabold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:brightness-110 shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 min-h-[50px]"
          >
            <span>{isEn ? "Join AllTripX Now — Free" : "Hemen AllTripX'e Katıl — Ücretsiz"}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950 py-8 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">
              All<span className="text-cyan-400">TripX</span>
            </span>
            <span className="text-slate-600">|</span>
            <span>© 2026 AllTripX Platform. {isEn ? "All rights reserved." : "Tüm hakları saklıdır."}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`hover:text-white transition-colors ${isEn ? "text-cyan-400 font-bold" : ""}`}
            >
              English
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLanguage("tr")}
              className={`hover:text-white transition-colors ${!isEn ? "text-cyan-400 font-bold" : ""}`}
            >
              Türkçe
            </button>
            <span>•</span>
            <Link href="/login" className="hover:text-white transition-colors">
              {isEn ? "Sign In" : "Giriş Yap"}
            </Link>
            <span>•</span>
            <Link href="/register" className="hover:text-white transition-colors">
              {isEn ? "Sign Up" : "Kayıt Ol"}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
