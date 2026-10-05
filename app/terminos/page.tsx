import { ShieldAlert, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import { LegalHeader, LegalFooter } from '@/components/legal/legal-nav';

export const metadata: Metadata = {
  title: 'Términos y Condiciones del Piloto — ResDigital',
  description:
    'Términos y condiciones de uso para la fase piloto del cuaderno de campo digital ResDigital en Costa Rica.',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header bar */}
      <LegalHeader current="terminos" />

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Title & Badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Documento Académico · Piloto de Investigación</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Términos y Condiciones del Piloto ResDigital
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Última actualización: 2 de octubre de 2026 · EIF-409 Aplicaciones Informáticas Globales
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-8 flex gap-4 text-amber-950">
          <ShieldAlert className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2 leading-relaxed">
            <p className="font-bold text-amber-900">
              Aviso explícito: Naturaleza académica y ausencia de asesoría legal o veterinaria
            </p>
            <p>
              El presente documento y la plataforma ResDigital han sido elaborados exclusivamente con fines académicos,
              de investigación y de desarrollo tecnológico en el marco del curso de grado universitario. <strong>Este documento no constituye asesoría legal profesional ni contrato mercantil comercial vinculante</strong>.
            </p>
            <p>
              De igual modo, las sugerencias de manejo zootécnico, tiempos de retiro sanitario o cálculos de proyección reproductiva <strong>no constituyen diagnóstico ni prescripción médica veterinaria</strong> y no eximen al productor de su deber de consultar a un profesional colegiado.
            </p>
          </div>
        </div>

        {/* Content Clauses */}
        <article className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">1</span>
              Propósito y Alcance del Piloto
            </h2>
            <p>
              ResDigital es una herramienta de cuaderno de campo digital orientada al apoyo operativo de pequeños y medianos productores ganaderos en Costa Rica. Su objetivo es facilitar el registro interno de eventos del hato (censos, pesajes, servicios de monta, palpaciones diagnósticas y control de tratamientos).
            </p>
            <p>
              El acceso a esta versión se concede a título de prueba piloto experimental para validación de usabilidad, integridad de datos y adaptación a la realidad operativa del campo costarricense.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">2</span>
              Identificación Oficial vs. Identificación Interna ResDigital
            </h2>
            <p>
              Conforme a la normativa nacional y las disposiciones de las autoridades competentes en Costa Rica (Servicio Nacional de Salud Animal - SENASA y Ministerio de Agricultura y Ganadería - MAG):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>DIIO (Dispositivo de Identificación Individual Oficial):</strong> Es el único identificador oficial con validez legal regulatoria ante el Estado costarricense. ResDigital permite almacenar el número DIIO oficial para fines de cotejo y trazabilidad interna.
              </li>
              <li>
                <strong>Arete Interno y Código QR ResDigital:</strong> Los identificadores de arete de trabajo, números de tatuaje y códigos QR generados por ResDigital son mecanismos puramente internos de localización expedita del expediente digital en la aplicación y <strong>en ningún caso sustituyen, modifican ni reemplazan el arete oficial o certificado oficial emitido por el Estado</strong>.
              </li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">3</span>
              Responsabilidad sobre Tratamientos Sanitarios y Retiros
            </h2>
            <p>
              La plataforma calcula estimaciones orientativas sobre los períodos de resguardo o retiro sanitario para leche y carne basados en los registros de dosis y principios activos suministrados por el usuario:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                El productor ganadero es el único responsable de verificar la etiqueta, dosis, vía de administración y período de carencia establecido en el prospecto del fabricante aprobado por SENASA.
              </li>
              <li>
                Los cálculos del sistema constituyen una ayuda de memoria y bajo ningún concepto deben utilizarse como única fuente para decidir la liberación comercial de leche o destino a matadero de un semoviente bajo tratamiento.
              </li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">4</span>
              Uso Aceptable y Seguridad de la Cuenta
            </h2>
            <p>
              Cada usuario registrado se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar información fidedigna respecto a la titularidad y administración de su finca o unidad productiva.</li>
              <li>Custodiar sus credenciales de acceso de forma confidencial. El sistema almacena contraseñas mediante funciones criptográficas de un solo sentido (algoritmos modernos de hash como bcrypt), imposibilitando su recuperación en texto legible.</li>
              <li>No intentar vulnerar los controles de aislamiento multi-tenant ni acceder a datos de fincas ajenas.</li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">5</span>
              Disponibilidad y Régimen de Garantía "Tal Cual" (As Is)
            </h2>
            <p>
              Por tratarse de un prototipo funcional en etapa de pilotaje académico, ResDigital se pone a disposición "tal cual" y según disponibilidad, sin garantías comerciales explícitas o implícitas de funcionamiento ininterrumpido. El equipo docente y de estudiantes promotores no responderá por eventuales pérdidas operativas derivadas de interrupciones del servicio o fallos de conectividad en zonas rurales.
            </p>
          </section>
        </article>

        {/* Footer Navigation */}
        <LegalFooter current="terminos" />
      </main>
    </div>
  );
}
