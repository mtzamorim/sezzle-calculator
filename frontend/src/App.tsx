import { Calculator } from './components/Calculator'

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#calculator-workspace">Skip to calculator</a>
      <div className="top-section">
        <header className="topbar page-container">
          <div className="brand" aria-label="Clarity calculator">
            <span className="brand-logo" aria-hidden="true">∑</span>
            <span className="brand-text"><strong>clarity</strong><span> / calculator</span></span>
          </div>
        </header>
        <div className="hero page-container">
          <div className="hero-copy">
            <span className="hero-eyebrow"><span className="eyebrow-line" /> A FULL-STACK CALCULATOR</span>
            <h1>Every calculation.<br /><em>Crystal clear.</em></h1>
            <p>Simple math. Thoughtful engineering. Seven operations, one reliable experience.</p>
            <div className="hero-features"><span><b>✓</b> Validated inputs</span><span><b>✓</b> Instant feedback</span><span><b>✓</b> Clean REST API</span></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-center">=</div>
            <span className="art-symbol symbol-plus">+</span><span className="art-symbol symbol-multiply">×</span><span className="art-symbol symbol-divide">÷</span>
          </div>
        </div>
      </div>
      <main id="calculator-workspace" tabIndex={-1} className="page-container content-section"><Calculator /></main>
      <footer className="site-footer page-container">
        <span>Clarity <span className="footer-mark">©</span> 2026</span>
        <span>Made for the Sezzle engineering challenge <span className="footer-middle">·</span> Built with React, TypeScript &amp; Go</span>
      </footer>
    </div>
  )
}
