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

  createExerciseState?: {
    name?: string;
    targetMuscle?: string;
  };

  createTemplateState?: {
    name?: string;
    exerciseIds?: number[];
  };

  editTemplateState?: {
    templateId: number;
    step?: 'IDLE' | 'RENAME' | 'ADD_EXERCISE';
  };

  editExerciseState?: {
    exerciseId: number;
    step?: 'IDLE' | 'RENAME' | 'RENAME_MUSCLE';
  };

  editMuscleGroupState?: {
    muscleGroupId: number;
    step?: 'IDLE' | 'RENAME';
  };
}

export interface MyContext extends Context {
  myContextProp: string;
  session: MySession;
  scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}
