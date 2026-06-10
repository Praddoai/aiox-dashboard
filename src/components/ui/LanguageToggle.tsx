import { useI18nStore } from '../../hooks/useI18n';

export function LanguageToggle() {
  const { locale, toggleLocale } = useI18nStore();

  return (
    <button
      onClick={toggleLocale}
      className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-tertiary hover:text-primary hover:bg-white/10 transition-colors uppercase tracking-wider"
      aria-label={`Idioma: ${locale === 'pt' ? 'Português' : 'English'}`}
      title={locale === 'pt' ? 'Switch to English' : 'Mudar para Português'}
    >
      {locale === 'pt' ? '🇧🇷' : '🇺🇸'}
      <span className="ml-0.5">{locale.toUpperCase()}</span>
    </button>
  );
}
