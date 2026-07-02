import { Context, Scenes } from 'telegraf';

export interface MySession extends Scenes.WizardSession<Scenes.WizardSessionData> {
  // We can store active workout variables here if needed
  workoutSessionId?: number;
  currentExerciseIndex?: number;
  
  // For the log-set wizard
  logSetState?: {
    exerciseId: number;
    weight?: number;
    reps?: number;
    reachedFailure?: boolean;
    failureRepNumber?: number | null;
    difficulty?: string;
    comment?: string | null;
    isEdit?: boolean;
    setId?: number;
  };
}

export interface MyContext extends Context {
  myContextProp: string;
  session: MySession;
  scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}
