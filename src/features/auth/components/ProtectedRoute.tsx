import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PageLoader } from '@/components/ui/PageLoader';
import { useAppSelector } from '@/app/hooks';

/** Пускает к приватным маршрутам только авторизованного пользователя. */
export function ProtectedRoute() {
  const status = useAppSelector((state) => state.auth.status);
  const location = useLocation();

  if (status === 'initializing') {
    return <PageLoader label="Проверяем сессию…" />;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
