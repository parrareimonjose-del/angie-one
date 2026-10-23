import { Screen } from '../src/ui';
import { useTranslation } from 'react-i18next';
import { EquipoSection } from '../src/rostros-ui';

/** Acerca de / Equipo: tarjetas idea 2 + Historia aprobada. */
export default function Historia() {
  const { t } = useTranslation();
  return (
    <Screen title={t('faces.historiaTitle')}>
      <EquipoSection />
    </Screen>
  );
}
