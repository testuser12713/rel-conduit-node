import {
  randEmail,
  randFullName,
  randLines,
  randParagraph,
  randPassword, randPhrase,
  randWord
} from '@ngneat/falso';
import { PrismaClient } from '@prisma/client';
import HttpException from '../app/models/http-exception.model';
import { RegisteredUser } from '../app/routes/auth/registered-user.model';
import { createUser } from '../app/routes/auth/auth.service';
import { addComment, createArticle } from '../app/routes/article/article.service';

const prisma = new PrismaClient();

export const generateUser = async (): Promise<RegisteredUser> =>
  createUser({
    username: randFullName(),
    email: randEmail(),
    password: randPassword(),
    image: 'https://api.realworld.io/images/demo-avatar.png',
    demo: true,
  });

export const generateArticle = async (id: number) =>
  createArticle(
    {
      title: randPhrase(),
      description: randParagraph(),
      body: randLines({ length: 10 }).join(' '),
      tagList: randWord({ length: 4 }),
    },
    id,
  );

export const generateComment = async (id: number, slug: string) =>
  addComment(randParagraph(), slug, id);

const generateUniqueArticle = async (id: number) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await generateArticle(id);
    } catch (error) {
      if (!(error instanceof HttpException) || error.errorCode !== 422) {
        throw error;
      }
    }
  }

  throw new Error('Could not generate a unique demo article');
};

const main = async () => {
  try {
    const users: RegisteredUser[] = [];

    for (let index = 0; index < 12; index += 1) {
      users.push(await generateUser());
    }

    for (const user of users) {
      const articles = [];

      for (let index = 0; index < 12; index += 1) {
        articles.push(await generateUniqueArticle(user.id));
      }

      for (const article of articles) {
        await Promise.all(users.map(userItem => generateComment(userItem.id, article.slug)));
      }
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
