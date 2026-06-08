import { Component, inject, OnInit, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

/** Plantillas legales — revisar con asesoría jurídica antes de publicación definitiva. */
const LEGAL: Record<string, { title: string; sections: { h: string; p: string }[] }> = {
  privacidad: {
    title: 'Política de privacidad',
    sections: [
      { h: 'Responsable', p: 'Spendlyx (info@spendlyx.com) es responsable del tratamiento de datos personales recogidos a través del sitio y el panel.' },
      { h: 'Datos que tratamos', p: 'Identificación, contacto, datos de cuenta, logs de uso del panel y comunicaciones que nos envíes.' },
      { h: 'Finalidad', p: 'Prestar el servicio, gestionar cuentas, seguridad, soporte y cumplimiento legal.' },
      { h: 'Conservación', p: 'Mientras mantengas la cuenta activa y el plazo legal aplicable tras baja.' },
      { h: 'Derechos', p: 'Acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a info@spendlyx.com.' },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    sections: [
      { h: 'Qué son', p: 'Archivos que el navegador almacena para recordar preferencias o medir uso.' },
      { h: 'Necesarias', p: 'Imprescindibles para sesión, seguridad y consentimiento.' },
      { h: 'Analíticas', p: 'Nos ayudan a entender uso agregado. Solo se activan con tu consentimiento.' },
      { h: 'Preferencias y marketing', p: 'Recuerdan opciones de interfaz o campañas. Requieren consentimiento.' },
      { h: 'Gestión', p: 'Puedes configurar preferencias desde el banner de cookies o tu navegador.' },
    ],
  },
  terminos: {
    title: 'Términos y condiciones',
    sections: [
      { h: 'Objeto', p: 'Regulan el acceso y uso del panel Spendlyx y servicios asociados.' },
      { h: 'Cuenta', p: 'Debes proporcionar información veraz y mantener la confidencialidad de credenciales.' },
      { h: 'Uso aceptable', p: 'Prohibido uso ilícito, interferencia con el servicio o acceso no autorizado.' },
      { h: 'Propiedad intelectual', p: 'Spendlyx y sus licenciantes conservan derechos sobre software y marca.' },
      { h: 'Limitación', p: 'El servicio se presta «tal cual» dentro de los límites legales aplicables.' },
    ],
  },
  'aviso-legal': {
    title: 'Aviso legal',
    sections: [
      { h: 'Titular', p: 'Spendlyx — contacto: info@spendlyx.com — sitio: https://spendlyx.com' },
      { h: 'Condiciones de uso del sitio', p: 'El acceso implica aceptación de este aviso y políticas enlazadas.' },
      { h: 'Propiedad intelectual', p: 'Contenidos protegidos. Reproducción no autorizada prohibida.' },
      { h: 'Enlaces', p: 'Enlaces externos son responsabilidad de sus titulares.' },
      { h: 'Legislación', p: 'Legislación aplicable según residencia del titular del servicio.' },
    ],
  },
}

@Component({
  standalone: true,
  selector: 'app-legal-page',
  template: `
    <header class="pub-page-hero">
      <div class="pub-wrap">
        <h1>{{ content().title }}</h1>
      </div>
    </header>
    <div class="pub pub-page-body">
      <div class="pub-wrap pub-legal pub-card">
        @for (s of content().sections; track s.h) {
          <section><h2>{{ s.h }}</h2><p>{{ s.p }}</p></section>
        }
        <p class="pub-legal__updated">Última actualización: {{ updated }}</p>
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `.pub-legal { max-width: 720px; padding: 2rem; } .pub-legal h2 { font-size: 1.05rem; margin: 1.5rem 0 .5rem; font-weight: 700; } .pub-legal p { line-height: 1.7; color: #475569; margin: 0; } .pub-legal__updated { margin-top: 2rem; font-size: .8rem; color: #94a3b8; }`],
})
export class LegalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  readonly updated = '2026-06-09'
  slug = 'privacidad'
  content = computed(() => LEGAL[this.slug] ?? LEGAL['privacidad'])
  ngOnInit(): void {
    this.slug = this.route.snapshot.data['legal'] ?? 'privacidad'
    const s = this.route.snapshot.data['seo']
    if (s) this.seo.apply(s)
  }
}
