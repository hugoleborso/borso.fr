import { type NavigateOptions, type To, useNavigate } from 'react-router-dom';

export type NavigateTo = (destination: To, options?: NavigateOptions) => void;

const NAVIGATION_SURFACE = 'navigation';

export function useNavigateTo(): NavigateTo {
  const navigate = useNavigate();
  return (destination, options) => {
    Promise.resolve(navigate(destination, options)).catch((error: unknown) => {
      console.error({ surface: NAVIGATION_SURFACE, destination, error });
    });
  };
}
