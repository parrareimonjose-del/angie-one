import { useTranslation } from 'react-i18next';
import { Screen } from '../src/ui';
import { SecurityScreenBody } from '../src/faltantes-ui';
export default function Security() { const { t } = useTranslation(); return <Screen title={`🔐 ${t('fx.secTitle')}`}><SecurityScreenBody /></Screen>; }
