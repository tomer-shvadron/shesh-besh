import { useAppLogic } from '@/AppLogic';
import { GameScreen } from '@/components/GameScreen/GameScreen';

export function App(): React.JSX.Element {
  const { themeClass } = useAppLogic();

  return (
    <div className={`${themeClass} h-full w-full`}>
      <GameScreen />
    </div>
  );
}
