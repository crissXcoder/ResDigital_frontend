import { ShieldCheck, Lock, Database, UserCheck, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import { LegalHeader, LegalFooter } from '@/components/legal/legal-nav';

export const metadata: Metadata = {
  title: 'Política de Privacidad del Piloto — ResDigital',
  description:
    'Política de privacidad y protección de datos para la fase piloto de ResDigital en Costa Rica (Ley N° 8968).',
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header bar */}
      <LegalHeader current="privacidad" />

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Title & Badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300 mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Documento Académico · Piloto de Investigación (Ley N° 8968 Costa Rica)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Última actualización: 2 de octubre de 2026 · EIF-409 Aplicaciones Informáticas Globales
          </p>
        </div>

        {/* Academic and Legal Disclaimer Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8 flex gap-4 text-blue-950">
          <ShieldCheck className="w-6 h-6 text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2 leading-relaxed">
            <p className="font-bold text-blue-900">
              Aviso sobre naturaleza académica y no asesoría jurídica
            </p>
            <p>
              Esta política ha sido estructurada como parte de un proyecto de ingeniería de software e investigación académica universitaria. <strong>No constituye asesoría jurídica formal</strong>, sino un compromiso transparente de buenas prácticas técnicas en concordancia con los principios de la <strong>Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica (Ley N° 8968)</strong> y los lineamientos de la Agencia de Protección de Datos de los Habitantes (PRODHAB).
            </p>
          </div>
        </div>

        {/* Privacy Sections */}
        <article className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed text-sm sm:text-base">
          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              1. Responsable del Tratamiento y Contexto
            </h2>
            <p>
              El responsable técnico del tratamiento de los datos recolectados durante la fase piloto es el equipo de desarrollo e investigación del proyecto ResDigital (EIF-409).
            </p>
            <p>
              La recolección de información tiene como único propósito evaluar la funcionalidad técnica, usabilidad y valor del cuaderno de campo digital ganadero para productores de Costa Rica.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              2. Categorías de Datos Recolectados
            </h2>
            <p>
              Durante el uso de la plataforma, ResDigital gestiona dos clases principales de información:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Datos de Usuario y Cuenta:</strong> Nombre completo, dirección de correo electrónico, rol operativo (Administrador, Veterinario, Mayordomo) y contraseña de acceso.
              </li>
              <li>
                <strong>Datos Productivos y del Hato (Datos de la Finca):</strong> Nombre de la finca, número de registro o DIIO oficial de los animales, arete interno de trabajo, peso corporal, genealogía (padre/madre), registros de servicios reproductivos, diagnósticos de preñez, fechas de secado, historial de medicamentos aplicados y ocupación de potreros.
              </li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              3. Medidas de Seguridad y Aislamiento de Datos (Multi-Tenant)
            </h2>
            <p>
              En cumplimiento del principio de seguridad establecido en el artículo 10 de la Ley N° 8968, se implementan las siguientes salvaguardas técnicas:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Protección Criptográfica de Contraseñas:</strong> Las credenciales de acceso se protegen mediante algoritmos robustos de hash de contraseñas de un solo sentido (bcrypt con sal aleatoria). <em>Bajo ninguna circunstancia se almacenan contraseñas en texto claro ni se emplean algoritmos vulnerables o deprecados (como MD5 o SHA-1)</em>.
              </li>
              <li>
                <strong>Aislamiento Estricto por Finca (Multi-Tenant):</strong> Cada registro de animal, pesaje, tratamiento o evento está estrictamente asociado al identificador único de la finca (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-800">tenant_id</code>). El motor de base de datos impone políticas de seguridad a nivel de fila (Row Level Security - RLS) que impiden a cualquier usuario de una finca consultar o modificar datos de otra finca.
              </li>
              <li>
                <strong>Comunicaciones Cifradas:</strong> Todo el tráfico entre el navegador web y la API de ResDigital se transmite a través de canales cifrados HTTPS/TLS.
              </li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">4</span>
              No Divulgación y No Venta de Datos
            </h2>
            <p>
              Los datos recolectados no son comercializados, cedidos, ni compartidos con empresas de publicidad, distribuidores de insumos ni terceros no autorizados. Los datos zootécnicos y sanitarios generados pertenecen al titular de la finca participante en el piloto.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">5</span>
              Derechos del Titular (Derechos ARCO)
            </h2>
            <p>
              Conforme a la Ley N° 8968 de Costa Rica, todo usuario o titular de finca participante en el piloto tiene derecho a:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Acceso:</strong> Consultar la totalidad de los datos y registros históricos almacenados sobre su finca y sus animales en cualquier momento a través del sistema.</li>
              <li><strong>Rectificación:</strong> Corregir información inexacta o desactualizada de sus semovientes o perfil de usuario.</li>
              <li><strong>Cancelación y Supresión:</strong> Solicitar la eliminación completa de su cuenta y de los datos operativos asociados al término de su participación en el piloto.</li>
              <li><strong>Oposición:</strong> Negarse al tratamiento de sus datos para finalidades no esenciales del proyecto de investigación.</li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">6</span>
              Modificaciones a la Política
            </h2>
            <p>
              Cualquier ajuste técnico o normativo introducido a la presente política durante la vigencia del piloto será notificado en esta misma página con la fecha de última actualización.
            </p>
          </section>
        </article>

        {/* Footer Navigation */}
        <LegalFooter current="privacidad" />
      </main>
    </div>
  );
}
