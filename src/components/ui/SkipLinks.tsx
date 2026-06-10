import { useSkipLinks } from '../../hooks/useA11y';

export function SkipLinks() {
  const { skipToMain, skipToNav } = useSkipLinks();

  return (
    <div className="skip-links">
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          skipToMain();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>
      <a
        href="#navigation"
        onClick={(e) => {
          e.preventDefault();
          skipToNav();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-64 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Pular para a navegação
      </a>
    </div>
  );
}
