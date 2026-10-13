import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import { Send } from 'lucide-react'
import { CONTACT_EMAIL } from './data'

// Identifiants EmailJS (clé publique : elle est faite pour être visible côté navigateur).
// Les noms des champs du formulaire (name, email, Objet, message) sont ceux du modèle EmailJS existant.
const SERVICE_ID = 'service_544dtbz'
const TEMPLATE_ID = 'template_92b8j6r'
const PUBLIC_KEY = 'e9jmdOldjz_hULGfi'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = formRef.current
    if (!form || status === 'sending') return

    // Champ piège invisible : un humain ne le remplit jamais, un robot si.
    const trap = (form.elements.namedItem('website') as HTMLInputElement | null)?.value
    if (trap) {
      setStatus('sent')
      form.reset()
      return
    }

    setStatus('sending')
    try {
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form, { publicKey: PUBLIC_KEY })
      setStatus('sent')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <form className="contact-form" ref={formRef} onSubmit={onSubmit} noValidate={false}>
      <div className="form-row">
        <label className="form-field" htmlFor="cf-name">
          <span>Nom et prénom</span>
          <input id="cf-name" name="name" type="text" autoComplete="name" required maxLength={80} />
        </label>
        <label className="form-field" htmlFor="cf-email">
          <span>Adresse e-mail</span>
          <input id="cf-email" name="email" type="email" autoComplete="email" required maxLength={120} />
        </label>
      </div>
      <label className="form-field" htmlFor="cf-subject">
        <span>Objet</span>
        <input id="cf-subject" name="Objet" type="text" required maxLength={120} />
      </label>
      <label className="form-field" htmlFor="cf-message">
        <span>Message</span>
        <textarea id="cf-message" name="message" rows={5} required maxLength={3000} />
      </label>
      <div className="form-trap" aria-hidden="true">
        <label htmlFor="cf-website">Ne pas remplir</label>
        <input id="cf-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Envoi en cours…' : 'Envoyer le message'} <Send size={15} />
        </button>
        <p className="form-status" role="status" aria-live="polite" data-state={status}>
          {status === 'sent' && 'Message envoyé. Je vous répondrai dès que possible.'}
          {status === 'error' && (
            <>L’envoi a échoué. Écrivez-moi directement à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
          )}
        </p>
      </div>
    </form>
  )
}
