"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export interface InvoiceState {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
}

const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoiceSchema = InvoiceSchema.omit({ id: true, date: true });

export const createInvoice = async (
  _: InvoiceState,
  formData: FormData
): Promise<InvoiceState> => {
  const validatedFields = CreateInvoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing fields. Failed to create invoice.",
    };
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    return { message: "Database Error: Failed to create invoice." };
  }

  revalidatePath("/dashbord/invoices");
  redirect("/dashboard/invoices");
};

const UpdateInvoiceSchema = InvoiceSchema.omit({ date: true });

export const updateInvoice = async (
  id: string,
  _: InvoiceState,
  formData: FormData
): Promise<InvoiceState> => {
  const validatedFields = UpdateInvoiceSchema.safeParse({
    id,
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to update invoice.",
    };
  }

  const { amount, customerId, status } = validatedFields.data;

  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    return { message: "Database Error: Failed to update invoice." };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
};

export const deleteInvoice = async (id: string) => {
  throw new Error("Failed to delete invoice.");

  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    return { message: "Database Error: Failed to delete invoice." };
  }
  revalidatePath("/dashboard/invoices");
};

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", Object.fromEntries(formData));
  } catch (error) {
    if ((error as Error).message.includes("CredentialsSignin")) {
      return "CredentialsSignin";
    }
    throw error;
  }
}
