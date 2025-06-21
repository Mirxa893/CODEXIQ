'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/db/queries';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    console.log("Login attempt with data:", validatedData); // Debugging

    // Sign in with credentials
    const loginResult = await signIn('credentials', {
      email: validatedData.email.toLowerCase(), // Normalize email to lowercase
      password: validatedData.password,
      redirect: false,
    });

    if (loginResult?.error) {
      console.log("Login error:", loginResult.error); // Debugging
      return { status: 'failed' }; // Failed login
    }

    return { status: 'success' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const emailNormalized = validatedData.email.toLowerCase(); // Normalize email

    console.log("Registration attempt with data:", validatedData); // Debugging

    // Check if the user already exists
    let [user] = await getUser(emailNormalized);

    if (user) {
      console.log("User already exists:", user); // Debugging
      return { status: 'user_exists' };
    } else {
      // Create the user (ensure proper password hashing in your database logic)
      await createUser(emailNormalized, validatedData.password);

      // Sign in after creating the user
      await signIn('credentials', {
        email: emailNormalized,
        password: validatedData.password,
        redirect: false,
      });

      return { status: 'success' };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};
