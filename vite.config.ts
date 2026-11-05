/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Подставляет публичный домен из переменной сборки VITE_SITE_URL в og:image
 * вместо плейсхолдера YOUR-NETLIFY-DOMAIN. Без переменной плейсхолдер
 * остаётся — видимый сигнал, что домен ещё не настроен (см. README).
 */
function ogImageSiteUrl(): Plugin {
  return {
    name: 'og-image-site-url',
    transformIndexHtml(html) {
      const site = process.env.VITE_SITE_URL?.replace(/\/+$/, '');
      return site ? html.replaceAll('https://YOUR-NETLIFY-DOMAIN', site) : html;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ogImageSiteUrl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og-image.png'],
      manifest: {
        name: 'JobTrack AI',
        short_name: 'JobTrack',
        description:
          'Управление поиском работы и подготовка к техническим собеседованиям с помощью ИИ',
        lang: 'ru',
        display: 'standalone',
        start_url: '/',
        background_color: '#f2f2f7',
        theme_color: '#007aff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // SPA-фолбэк уже делает Netlify (_redirects); офлайн-режим не критичен.
        navigateFallback: null,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    globals: true,
    // Только клиентские тесты. Тесты Edge Functions (supabase/functions)
    // написаны под Deno и запускаются командой npm run check:functions.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
