import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

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
    { name: 'Жим в тренажёре сидя', targetMuscle: 'грудь' },
    { name: 'Тяга верхнего блока к груди', targetMuscle: 'спина / ширина' },
    { name: 'Горизонтальная тяга в тренажёре', targetMuscle: 'спина / толщина' },
    { name: 'Жим гантелей сидя', targetMuscle: 'плечи' },
    { name: 'Жим ногами', targetMuscle: 'квадрицепс / ноги' },
    { name: 'Сгибание ног сидя или лёжа', targetMuscle: 'задняя поверхность бедра' },
    { name: 'Сгибание рук с гантелями', targetMuscle: 'бицепс' },
    { name: 'Разгибание рук на блоке', targetMuscle: 'трицепс' },
    { name: 'Скручивания', targetMuscle: 'пресс' },
    // B
    { name: 'Гоблет-присед с гантелью', targetMuscle: 'квадрицепс / ноги' },
    { name: 'Румынская тяга с гантелями', targetMuscle: 'ягодицы / задняя цепь' },
    { name: 'Ягодичный мост / hip thrust', targetMuscle: 'ягодицы' },
    { name: 'Подъёмы на носки', targetMuscle: 'икры' },
    { name: 'Жим гантелей лёжа', targetMuscle: 'грудь' },
    { name: 'Тяга верхнего блока нейтральным хватом', targetMuscle: 'спина' },
    { name: 'Разведения гантелей в стороны', targetMuscle: 'плечи' },
    { name: 'Планка', targetMuscle: 'пресс' },
    // C
    { name: 'Жим в тренажёре или отжимания от высокой опоры', targetMuscle: 'грудь' },
    { name: 'Горизонтальная тяга сидя', targetMuscle: 'спина' },
    { name: 'Пуловер в блоке / тяга прямыми руками', targetMuscle: 'широчайшие' },
    { name: 'Разгибание ног в тренажёре', targetMuscle: 'квадрицепс' },
    { name: 'Сгибание ног в тренажёре', targetMuscle: 'задняя поверхность бедра' },
    { name: 'Гиперэкстензия с акцентом на ягодицы', targetMuscle: 'ягодицы / поясница' },
    { name: 'Сгибание рук в тренажёре или с гантелями', targetMuscle: 'бицепс' },
    { name: 'Подъём коленей в упоре / на скамье', targetMuscle: 'пресс' },
  ];

  const dbExercises: any[] = [];
  for (const ex of exercises) {
    const created = await prisma.exercise.findFirst({ where: { name: ex.name } }) 
      || await prisma.exercise.create({ data: { name: ex.name, targetMuscle: ex.targetMuscle } });
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
