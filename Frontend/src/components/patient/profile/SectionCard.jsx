import React from 'react'

const SectionCard = ({ title, subtitle, flush = false, children }) => {
  return (
    <section className="panel">
      <header className="panel__head">
        <h2 className="panel__title">{title}</h2>
        <p className="panel__sub">{subtitle}</p>
      </header>
      <div className={flush ? '' : 'panel__body'}>{children}</div>
    </section>
  )
}

export default SectionCard