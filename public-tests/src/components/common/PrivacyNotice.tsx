import React, { useState } from 'react';

interface PrivacyNoticeProps {
  researchId?: string;
  researchTitle?: string;
  onAccept?: () => void;
  onReject?: () => void;
  isModal?: boolean;
  className?: string;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  researchId = 'research',
  researchTitle = 'Investigación de Usabilidad',
  onAccept,
  onReject,
  isModal = false,
  className = ''
}) => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', title: 'Resumen Ejecutivo', icon: '📋' },
    { id: 'data-collected', title: 'Datos Recopilados', icon: '📊' },
    { id: 'purpose', title: 'Propósito del Tratamiento', icon: '🎯' },
    { id: 'legal-basis', title: 'Base Legal', icon: '⚖️' },
    { id: 'data-sharing', title: 'Compartir Datos', icon: '🤝' },
    { id: 'data-security', title: 'Seguridad de Datos', icon: '🔒' },
    { id: 'retention', title: 'Retención de Datos', icon: '⏰' },
    { id: 'your-rights', title: 'Sus Derechos', icon: '👤' },
    { id: 'contact', title: 'Contacto', icon: '📞' }
  ];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'overview':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Resumen Ejecutivo</h3>
            <p className="text-gray-700 leading-relaxed">
              Este aviso de privacidad describe cómo recopilamos, utilizamos y protegemos su información personal
              como parte de {researchTitle}. Su privacidad es fundamental para nosotros y nos comprometemos a
              proteger sus datos personales de acuerdo con el Reglamento General de Protección de Datos (GDPR)
              y otras leyes de privacidad aplicables.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Información Clave</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Responsable del tratamiento:</strong> EmotioX Research Team</li>
                <li>• <strong>Base legal:</strong> Consentimiento explícito del usuario</li>
                <li>• <strong>Retención:</strong> Máximo 12 meses o hasta retirada del consentimiento</li>
                <li>• <strong>Derechos:</strong> Acceso, rectificación, supresión, portabilidad y oposición</li>
              </ul>
            </div>
          </div>
        );

      case 'data-collected':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Datos Personales Recopilados</h3>
            <p className="text-gray-700 leading-relaxed">
              Recopilamos los siguientes tipos de datos personales para llevar a cabo esta investigación:
            </p>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📱 Datos de Dispositivo</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Tipo de dispositivo (móvil, tablet, desktop)</li>
                  <li>• Sistema operativo y versión</li>
                  <li>• Navegador web y versión</li>
                  <li>• Resolución de pantalla</li>
                  <li>• Configuración de idioma</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📍 Datos de Ubicación</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Coordenadas GPS (latitud y longitud)</li>
                  <li>• Precisión de la ubicación</li>
                  <li>• Ciudad, región y país</li>
                  <li>• Dirección IP (para ubicación aproximada)</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">👁️ Datos de Eye Tracking</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Coordenadas de mirada (x, y)</li>
                  <li>• Tiempo de fijación en áreas de interés</li>
                  <li>• Patrones de movimiento ocular</li>
                  <li>• Tasa de parpadeo</li>
                  <li>• Dilatación de pupila (si está disponible)</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">🧠 Datos Cognitivos</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Respuestas a tareas cognitivas</li>
                  <li>• Tiempo de respuesta</li>
                  <li>• Precisión de las respuestas</li>
                  <li>• Patrones de decisión</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📝 Datos Demográficos</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Rango de edad</li>
                  <li>• Género</li>
                  <li>• Nivel educativo</li>
                  <li>• Experiencia con tecnología</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📊 Datos de Uso</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Tiempo de participación</li>
                  <li>• Páginas visitadas</li>
                  <li>• Interacciones con la interfaz</li>
                  <li>• Errores o problemas técnicos</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'purpose':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Propósito del Tratamiento de Datos</h3>
            <p className="text-gray-700 leading-relaxed">
              Utilizamos sus datos personales exclusivamente para los siguientes propósitos legítimos:
            </p>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">🎯 Propósito Principal</h4>
                <p className="text-sm text-green-800">
                  <strong>Investigación de usabilidad y experiencia de usuario:</strong> Analizar cómo los usuarios
                  interactúan con interfaces digitales para mejorar el diseño y la funcionalidad de productos y servicios.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Propósitos Específicos:</h4>
                <ul className="text-sm text-gray-700 space-y-2 ml-4">
                  <li>• <strong>Análisis de patrones de atención:</strong> Identificar qué elementos de la interfaz atraen más atención</li>
                  <li>• <strong>Optimización de flujos de usuario:</strong> Mejorar la navegación y usabilidad</li>
                  <li>• <strong>Validación de diseños:</strong> Verificar la efectividad de diferentes diseños</li>
                  <li>• <strong>Investigación académica:</strong> Contribuir al conocimiento científico en UX/UI</li>
                  <li>• <strong>Desarrollo de productos:</strong> Informar el desarrollo de nuevas funcionalidades</li>
                  <li>• <strong>Control de calidad:</strong> Asegurar que los productos cumplan estándares de usabilidad</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Limitaciones</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• No utilizamos sus datos para marketing directo</li>
                  <li>• No vendemos sus datos a terceros</li>
                  <li>• No tomamos decisiones automatizadas que le afecten</li>
                  <li>• No creamos perfiles de usuario para publicidad</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'legal-basis':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Base Legal para el Tratamiento</h3>
            <p className="text-gray-700 leading-relaxed">
              El tratamiento de sus datos personales se basa en las siguientes bases legales:
            </p>

            <div className="space-y-4">
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900 mb-2">✅ Consentimiento Explícito (Art. 6.1.a GDPR)</h4>
                <p className="text-sm text-blue-800">
                  Ha dado su consentimiento explícito para el tratamiento de sus datos personales para los
                  propósitos específicos descritos en este aviso. Puede retirar su consentimiento en cualquier momento.
                </p>
              </div>

              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-medium text-green-900 mb-2">🔬 Interés Legítimo (Art. 6.1.f GDPR)</h4>
                <p className="text-sm text-green-800">
                  El tratamiento es necesario para nuestros intereses legítimos en la investigación y
                  mejora de productos, siempre que no se vean afectados sus derechos y libertades fundamentales.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Evaluación de Intereses:</h4>
                <div className="text-sm text-gray-700 space-y-2">
                  <p><strong>Nuestros intereses:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Investigación científica y desarrollo de productos</li>
                    <li>• Mejora de la experiencia del usuario</li>
                    <li>• Innovación tecnológica</li>
                  </ul>

                  <p><strong>Sus derechos:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Privacidad y protección de datos personales</li>
                    <li>• Control sobre el uso de sus datos</li>
                    <li>• Derecho a la objeción</li>
                  </ul>

                  <p><strong>Equilibrio:</strong> Hemos evaluado que nuestros intereses legítimos no
                  prevalecen sobre sus derechos fundamentales, especialmente considerando las medidas
                  de protección implementadas.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'data-sharing':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Compartir y Transferir Datos</h3>
            <p className="text-gray-700 leading-relaxed">
              Sus datos personales se tratan con la máxima confidencialidad y solo se comparten en
              circunstancias específicas y limitadas:
            </p>

            <div className="space-y-4">
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-medium text-red-900 mb-2">🚫 Lo que NO hacemos</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• No vendemos sus datos personales</li>
                  <li>• No compartimos datos con anunciantes</li>
                  <li>• No transferimos datos a países sin protección adecuada</li>
                  <li>• No utilizamos datos para marketing directo</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Compartir Datos Permitido:</h4>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">🔬 Investigadores Autorizados</h5>
                  <p className="text-sm text-gray-700">
                    Solo investigadores autorizados con acuerdos de confidencialidad pueden acceder
                    a datos anonimizados para análisis científicos.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">⚖️ Cumplimiento Legal</h5>
                  <p className="text-sm text-gray-700">
                    Podemos compartir datos si es requerido por ley, orden judicial o autoridad
                    gubernamental competente.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">🛡️ Protección de Derechos</h5>
                  <p className="text-sm text-gray-700">
                    Podemos compartir datos para proteger nuestros derechos legales, propiedad
                    intelectual o seguridad.
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">🔧 Proveedores de Servicios</h5>
                  <p className="text-sm text-gray-700">
                    Utilizamos proveedores de servicios (hosting, análisis) que procesan datos
                    bajo nuestras instrucciones y con garantías de seguridad.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📊 Datos Anonimizados</h4>
                <p className="text-sm text-blue-800">
                  Los resultados de investigación se publican únicamente en forma anonimizada,
                  sin posibilidad de identificar a participantes individuales.
                </p>
              </div>
            </div>
          </div>
        );

      case 'data-security':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Seguridad y Protección de Datos</h3>
            <p className="text-gray-700 leading-relaxed">
              Implementamos medidas técnicas y organizativas robustas para proteger sus datos personales:
            </p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">🔐 Medidas Técnicas</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Encriptación SSL/TLS en tránsito</li>
                    <li>• Encriptación AES-256 en reposo</li>
                    <li>• Autenticación de dos factores</li>
                    <li>• Firewalls y sistemas de detección de intrusiones</li>
                    <li>• Copias de seguridad encriptadas</li>
                    <li>• Monitoreo continuo de seguridad</li>
                  </ul>
                </div>

                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">👥 Medidas Organizativas</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Políticas de acceso estrictas</li>
                    <li>• Formación obligatoria en privacidad</li>
                    <li>• Auditorías regulares de seguridad</li>
                    <li>• Procedimientos de respuesta a incidentes</li>
                    <li>• Evaluaciones de impacto en privacidad</li>
                    <li>• Designación de Delegado de Protección de Datos</li>
                  </ul>
                </div>
              </div>

              <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Gestión de Incidentes</h4>
                <p className="text-sm text-yellow-800">
                  En caso de una violación de datos que pueda afectar sus derechos y libertades,
                  le notificaremos dentro de las 72 horas posteriores a la detección, según lo
                  requieren las regulaciones GDPR.
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📋 Certificaciones y Cumplimiento</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Cumplimiento con GDPR (Reglamento General de Protección de Datos)</li>
                  <li>• Certificación ISO 27001 para gestión de seguridad de la información</li>
                  <li>• Cumplimiento con CCPA (California Consumer Privacy Act)</li>
                  <li>• Auditorías regulares por terceros independientes</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'retention':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Retención y Eliminación de Datos</h3>
            <p className="text-gray-700 leading-relaxed">
              Sus datos personales se conservan únicamente durante el tiempo necesario para cumplir
              con los propósitos para los que fueron recopilados:
            </p>

            <div className="space-y-4">
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-medium text-green-900 mb-2">⏰ Períodos de Retención</h4>
                <div className="text-sm text-green-800 space-y-2">
                  <div>
                    <strong>Datos de investigación activa:</strong> Hasta 12 meses después de la
                    finalización del estudio o hasta la retirada del consentimiento.
                  </div>
                  <div>
                    <strong>Datos anonimizados:</strong> Indefinidamente para investigación científica,
                    sin posibilidad de identificación personal.
                  </div>
                  <div>
                    <strong>Datos de contacto:</strong> Hasta 6 meses después de la finalización
                    del estudio para comunicación relacionada con la investigación.
                  </div>
                </div>
              </div>

              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900 mb-2">🗑️ Eliminación Automática</h4>
                <p className="text-sm text-blue-800">
                  Los datos personales se eliminan automáticamente al finalizar el período de retención
                  o cuando retira su consentimiento. La eliminación es permanente e irreversible.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Criterios de Eliminación:</h4>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• Finalización del propósito para el que fueron recopilados</li>
                  <li>• Retirada del consentimiento del usuario</li>
                  <li>• Solicitud de supresión (derecho al olvido)</li>
                  <li>• Cumplimiento de obligaciones legales</li>
                  <li>• Finalización del período de retención establecido</li>
                </ul>
              </div>

              <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <h4 className="font-medium text-yellow-900 mb-2">📊 Datos Anonimizados</h4>
                <p className="text-sm text-yellow-800">
                  Los datos anonimizados pueden conservarse indefinidamente para investigación científica,
                  ya que no permiten la identificación de personas individuales.
                </p>
              </div>
            </div>
          </div>
        );

      case 'your-rights':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Sus Derechos como Usuario</h3>
            <p className="text-gray-700 leading-relaxed">
              Según el GDPR y otras leyes de privacidad, tiene los siguientes derechos:
            </p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">👁️ Derecho de Acceso</h4>
                  <p className="text-sm text-blue-800">
                    Puede solicitar una copia de todos los datos personales que tenemos sobre usted,
                    incluyendo información sobre cómo los utilizamos.
                  </p>
                </div>

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">✏️ Derecho de Rectificación</h4>
                  <p className="text-sm text-green-800">
                    Puede solicitar que corrijamos cualquier dato personal inexacto o incompleto
                    que tengamos sobre usted.
                  </p>
                </div>

                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-900 mb-2">🗑️ Derecho de Supresión</h4>
                  <p className="text-sm text-red-800">
                    Puede solicitar que eliminemos sus datos personales ("derecho al olvido")
                    en ciertas circunstancias.
                  </p>
                </div>

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium text-purple-900 mb-2">📦 Derecho de Portabilidad</h4>
                  <p className="text-sm text-purple-800">
                    Puede solicitar que le proporcionemos sus datos en un formato estructurado
                    y legible por máquina.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <h4 className="font-medium text-orange-900 mb-2">⛔ Derecho de Oposición</h4>
                  <p className="text-sm text-orange-800">
                    Puede oponerse al tratamiento de sus datos personales en ciertas circunstancias,
                    especialmente para fines de marketing directo.
                  </p>
                </div>

                <div className="border border-teal-200 rounded-lg p-4 bg-teal-50">
                  <h4 className="font-medium text-teal-900 mb-2">🔄 Derecho de Retirada</h4>
                  <p className="text-sm text-teal-800">
                    Puede retirar su consentimiento en cualquier momento, sin afectar la
                    legalidad del tratamiento anterior.
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📞 Cómo Ejercer Sus Derechos</h4>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>Para ejercer cualquiera de estos derechos, puede:</p>
                  <ul className="ml-4 space-y-1">
                    <li>• Contactarnos por email: privacy@emotiox.com</li>
                    <li>• Usar el formulario de contacto en nuestra web</li>
                    <li>• Escribirnos por correo postal</li>
                  </ul>
                  <p><strong>Tiempo de respuesta:</strong> Responderemos dentro de 30 días,
                  aunque podemos extender este plazo en casos complejos.</p>
                </div>
              </div>

              <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <h4 className="font-medium text-yellow-900 mb-2">⚖️ Derecho de Reclamación</h4>
                <p className="text-sm text-yellow-800">
                  Si no está satisfecho con nuestra respuesta, tiene derecho a presentar una
                  reclamación ante la autoridad de protección de datos de su país.
                </p>
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3>
            <p className="text-gray-700 leading-relaxed">
              Para cualquier pregunta sobre este aviso de privacidad o el tratamiento de sus datos personales:
            </p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-900 mb-2">📧 Contacto Principal</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Email:</strong> privacy@emotiox.com</p>
                    <p><strong>Asunto:</strong> Consulta de Privacidad - {researchId}</p>
                    <p><strong>Respuesta:</strong> Dentro de 48 horas</p>
                  </div>
                </div>

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-900 mb-2">👤 Delegado de Protección de Datos</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <p><strong>Email:</strong> dpo@emotiox.com</p>
                    <p><strong>Especialidad:</strong> Cumplimiento GDPR</p>
                    <p><strong>Respuesta:</strong> Dentro de 72 horas</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">📮 Dirección Postal</h4>
                <div className="text-sm text-gray-700">
                  <p><strong>EmotioX Research Team</strong></p>
                  <p>Attn: Privacy Officer</p>
                  <p>Calle de la Innovación, 123</p>
                  <p>28001 Madrid, España</p>
                </div>
              </div>

              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-medium text-purple-900 mb-2">🔗 Recursos Adicionales</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• <strong>Página web:</strong> www.emotiox.com/privacy</li>
                  <li>• <strong>Formulario de contacto:</strong> www.emotiox.com/contact</li>
                  <li>• <strong>FAQ de privacidad:</strong> www.emotiox.com/privacy/faq</li>
                  <li>• <strong>Política de cookies:</strong> www.emotiox.com/cookies</li>
                </ul>
              </div>

              <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Información Importante</h4>
                <div className="text-sm text-yellow-800 space-y-1">
                  <p>• Incluya su ID de investigación ({researchId}) en todas las comunicaciones</p>
                  <p>• Para solicitudes urgentes, use el email del DPO</p>
                  <p>• Mantenemos un registro de todas las solicitudes de derechos</p>
                  <p>• No cobramos por ejercer sus derechos de privacidad</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className={`bg-white rounded-lg shadow-lg ${isModal ? 'max-w-4xl mx-4 max-h-[90vh] overflow-y-auto' : ''} ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Aviso de Privacidad
            </h2>
            <p className="text-gray-600 mt-1">
              {researchTitle} - ID: {researchId}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              <p>Versión 1.0</p>
              <p>Cumple GDPR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderSection(activeSection)}
      </div>

      {/* Footer */}
      {isModal && (onAccept || onReject) && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>Al continuar, confirma que ha leído y comprendido este aviso de privacidad</p>
            </div>
            <div className="flex space-x-3">
              {onReject && (
                <button
                  onClick={onReject}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Rechazar
                </button>
              )}
              {onAccept && (
                <button
                  onClick={onAccept}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Aceptar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        {content}
      </div>
    );
  }

  return content;
};
