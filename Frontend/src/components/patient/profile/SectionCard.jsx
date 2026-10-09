import React from 'react'
import ProfileStyle from '../../../assets/styles/profile.module.css'

const SectionCard = ({ title, subtitle, flush = false, children }) => {
  return (
    <section className={ProfileStyle['panel']}>
      <header className={ProfileStyle['panel__head']}>
        <h2 className={ProfileStyle['panel__title']}>{title}</h2>
        <p className={ProfileStyle['panel__sub']}>{subtitle}</p>
      </header>
      <div className={flush ? '' : ProfileStyle['panel__body']}>{children}</div>
    </section>
  )
}

export default SectionCard