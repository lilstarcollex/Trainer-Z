import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  const muscleGroups = [
    'Грудь',
    'Спина',
    'Ноги',
    'Руки',
    'Плечи',
    'Пресс',
    'Ягодицы',
    'Икры'
  ];

  const dbMuscleGroups: Record<string, number> = {};
  for (const groupName of muscleGroups) {
    const created = await prisma.muscleGroup.findFirst({ where: { name: groupName } })
      || await prisma.muscleGroup.create({ data: { name: groupName } });
    dbMuscleGroups[groupName] = created.id;
  }

  const templateA = await prisma.workoutTemplate.upsert({
    where: { code: 'A' },
    update: {},
    create: { name: 'Тренировка A — верх + ноги', code: 'A' },
  });

  const templateB = await prisma.workoutTemplate.upsert({
    where: { code: 'B' },
    update: {},
    create: { name: 'Тренировка B — ноги + спина + грудь', code: 'B' },
  });

  const templateC = await prisma.workoutTemplate.upsert({
    where: { code: 'C' },
    update: {},
    create: { name: 'Тренировка C — сбалансированная', code: 'C' },
  });

  const exercises = [
    // A
    { name: 'Жим в тренажёре сидя', muscleGroup: 'Грудь' },
    { name: 'Тяга верхнего блока к груди', muscleGroup: 'Спина' },
    { name: 'Горизонтальная тяга в тренажёре', muscleGroup: 'Спина' },
    { name: 'Жим гантелей сидя', muscleGroup: 'Плечи' },
    { name: 'Жим ногами', muscleGroup: 'Ноги' },
    { name: 'Сгибание ног сидя или лёжа', muscleGroup: 'Ноги' },
    { name: 'Сгибание рук с гантелями', muscleGroup: 'Руки' },
    { name: 'Разгибание рук на блоке', muscleGroup: 'Руки' },
    { name: 'Скручивания', muscleGroup: 'Пресс' },
    // B
    { name: 'Гоблет-присед с гантелью', muscleGroup: 'Ноги' },
    { name: 'Румынская тяга с гантелями', muscleGroup: 'Ноги' },
    { name: 'Ягодичный мост / hip thrust', muscleGroup: 'Ягодицы' },
    { name: 'Подъёмы на носки', muscleGroup: 'Икры' },
    { name: 'Жим гантелей лёжа', muscleGroup: 'Грудь' },
    { name: 'Тяга верхнего блока нейтральным хватом', muscleGroup: 'Спина' },
    { name: 'Разведения гантелей в стороны', muscleGroup: 'Плечи' },
    { name: 'Планка', muscleGroup: 'Пресс' },
    // C
    { name: 'Жим в тренажёре или отжимания от высокой опоры', muscleGroup: 'Грудь' },
    { name: 'Горизонтальная тяга сидя', muscleGroup: 'Спина' },
    { name: 'Пуловер в блоке / тяга прямыми руками', muscleGroup: 'Спина' },
    { name: 'Разгибание ног в тренажёре', muscleGroup: 'Ноги' },
    { name: 'Сгибание ног в тренажёре', muscleGroup: 'Ноги' },
    { name: 'Гиперэкстензия с акцентом на ягодицы', muscleGroup: 'Ягодицы' },
    { name: 'Сгибание рук в тренажёре или с гантелями', muscleGroup: 'Руки' },
    { name: 'Подъём коленей в упоре / на скамье', muscleGroup: 'Пресс' },
  ];

  const dbExercises: any[] = [];
  for (const ex of exercises) {
    const created = await prisma.exercise.findFirst({ where: { name: ex.name } }) 
      || await prisma.exercise.create({ data: { name: ex.name, muscleGroupId: dbMuscleGroups[ex.muscleGroup] } });
    dbExercises.push(created);
  }

  const mapToTemplate = async (templateId: number, exerciseNames: string[]) => {
    // Clear existing mappings to avoid unique constraint conflicts on re-seed
    await prisma.workoutTemplateExercise.deleteMany({
      where: { templateId },
    });

    for (let i = 0; i < exerciseNames.length; i++) {
      const ex = dbExercises.find((e) => e.name === exerciseNames[i]);
      if (ex) {
        await prisma.workoutTemplateExercise.create({
          data: { templateId, exerciseId: ex.id, order: i },
        });
      }
    }
  };

  await mapToTemplate(templateA.id, [
    'Жим в тренажёре сидя',
    'Тяга верхнего блока к груди',
    'Горизонтальная тяга в тренажёре',
    'Жим гантелей сидя',
    'Жим ногами',
    'Сгибание ног сидя или лёжа',
    'Сгибание рук с гантелями',
    'Разгибание рук на блоке',
    'Скручивания'
  ]);

  await mapToTemplate(templateB.id, [
    'Гоблет-присед с гантелью',
    'Румынская тяга с гантелями',
    'Ягодичный мост / hip thrust',
    'Подъёмы на носки',
    'Жим гантелей лёжа',
    'Тяга верхнего блока нейтральным хватом',
    'Разведения гантелей в стороны',
    'Планка'
  ]);

  await mapToTemplate(templateC.id, [
    'Жим в тренажёре или отжимания от высокой опоры',
    'Горизонтальная тяга сидя',
    'Пуловер в блоке / тяга прямыми руками',
    'Разгибание ног в тренажёре',
    'Сгибание ног в тренажёре',
    'Гиперэкстензия с акцентом на ягодицы',
    'Сгибание рук в тренажёре или с гантелями',
    'Подъём коленей в упоре / на скамье'
  ]);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
