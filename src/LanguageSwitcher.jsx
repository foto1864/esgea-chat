import { LANGS, setStoredLang } from './i18n'

export default function LanguageSwitcher({ lang, setLang }) {
  function changeLang(nextLang) {
    setStoredLang(nextLang)
    setLang(nextLang)
  }

  return (
    <div className="language-switcher">
      {Object.entries(LANGS).map(([code, item]) => (
        <button
          key={code}
          type="button"
          className={'lang-btn ' + (lang === code ? 'active' : '')}
          onClick={() => changeLang(code)}
          title={item.label}
        >
          <span>{item.flag}</span>
          <span>{item.short}</span>
        </button>
      ))}
    </div>
  )
}