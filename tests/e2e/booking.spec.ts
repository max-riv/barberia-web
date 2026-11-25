import { expect, test, type Page } from "@playwright/test";

const BUSINESS_NAME = "Charlie's Barbershop";
const CUSTOMER_NAME = "Test E2E";
const APPOINTMENT_URL = /\/cita\/[0-9a-f-]{36}$/;
const SLOT_TAKEN_MESSAGE = "Ese espacio se acaba de ocupar";
const EXPECT_TIMEOUT = 30_000;
const MAX_BOOKING_ATTEMPTS = 3;

test.use({
  actionTimeout: 30_000,
  navigationTimeout: 60_000,
});

/** Ocho dígitos válidos en Costa Rica y distintos entre ejecuciones. */
function uniqueCostaRicaPhone(): string {
  return `8${Date.now().toString().slice(-7)}`;
}

async function visibleBookingAlerts(page: Page): Promise<string[]> {
  // Next.js tiene un anunciador de rutas con role="alert" fuera de la página;
  // solo los alertas del formulario representan el resultado de la reserva.
  const alerts = page.locator("#datos").getByRole("alert");
  const texts: string[] = [];

  for (const alert of await alerts.all()) {
    if (await alert.isVisible()) {
      const text = (await alert.textContent())?.trim();
      if (text) {
        texts.push(text);
      }
    }
  }

  return texts;
}

async function expectLanding(page: Page): Promise<void> {
  await expect(
    page.getByRole("link", { name: BUSINESS_NAME, exact: true }),
  ).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(
    page.getByRole("heading", {
      name: "Tu corte, sin llamadas ni esperas.",
      exact: true,
    }),
  ).toBeVisible();

  const businessSection = page.locator("#horarios");
  await expect(businessSection).toContainText("Corte");
  await expect(businessSection).toContainText("Bloques de 30 minutos");
  await expect(businessSection).toContainText("₡6.000");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    contentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(
    dimensions.contentWidth,
    `El documento mide ${dimensions.contentWidth}px y desborda el viewport de ${dimensions.viewportWidth}px`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth);
}

async function selectFirstAvailableSlot(page: Page): Promise<{
  outcome: "ready" | "taken" | `error: ${string}`;
  time: string | null;
}> {
  const dateSection = page.locator('section[aria-labelledby="paso-fecha"]');
  const slotSection = page.locator('section[aria-labelledby="paso-hora"]');
  const availableSlots = slotSection.locator('a[href*="hora="]');

  await expect(dateSection.getByRole("link").first()).toBeVisible({
    timeout: EXPECT_TIMEOUT,
  });
  await expect(dateSection.locator('a[aria-current="date"]')).toBeVisible();
  await expect(availableSlots.first()).toBeVisible({
    timeout: EXPECT_TIMEOUT,
  });

  const firstSlot = availableSlots.first();
  const time = (await firstSlot.textContent())?.trim() ?? null;
  await firstSlot.click();
  await expect(page).toHaveURL(/[?&]hora=/);

  const result: {
    outcome: "pending" | "ready" | "taken" | `error: ${string}`;
  } = { outcome: "pending" };

  await expect
    .poll(
      async () => {
        if (
          await page
            .getByRole("button", { name: "Confirmar cita", exact: true })
            .isVisible()
        ) {
          result.outcome = "ready";
          return result.outcome;
        }

        const alerts = await visibleBookingAlerts(page);
        if (alerts.some((text) => text.includes(SLOT_TAKEN_MESSAGE))) {
          result.outcome = "taken";
          return result.outcome;
        }
        if (alerts.length > 0) {
          result.outcome = `error: ${alerts.join(" | ")}`;
          return result.outcome;
        }

        return "pending";
      },
      { timeout: EXPECT_TIMEOUT },
    )
    .not.toBe("pending");

  if (result.outcome === "pending") {
    throw new Error("El formulario de reserva no llegó a ningún estado.");
  }

  return {
    outcome: result.outcome,
    time: result.outcome === "ready" ? time : null,
  };
}

async function submitBooking(
  page: Page,
): Promise<"booked" | "taken" | `error: ${string}`> {
  const result: {
    outcome: "pending" | "booked" | "taken" | `error: ${string}`;
  } = { outcome: "pending" };

  await page
    .getByRole("button", { name: "Confirmar cita", exact: true })
    .click();

  await expect
    .poll(
      async () => {
        if (APPOINTMENT_URL.test(new URL(page.url()).pathname)) {
          result.outcome = "booked";
          return result.outcome;
        }

        const alerts = await visibleBookingAlerts(page);
        if (alerts.some((text) => text.includes(SLOT_TAKEN_MESSAGE))) {
          result.outcome = "taken";
          return result.outcome;
        }
        if (alerts.length > 0) {
          result.outcome = `error: ${alerts.join(" | ")}`;
          return result.outcome;
        }

        return "pending";
      },
      { timeout: EXPECT_TIMEOUT },
    )
    .not.toBe("pending");

  if (result.outcome === "pending") {
    throw new Error("El envío de la reserva no llegó a ningún estado.");
  }

  return result.outcome;
}

async function bookAppointment(
  page: Page,
  phone: string,
  mobile: boolean,
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_BOOKING_ATTEMPTS; attempt += 1) {
    const selection = await selectFirstAvailableSlot(page);

    if (selection.outcome === "taken") {
      if (attempt === MAX_BOOKING_ATTEMPTS) {
        throw new Error(
          `El espacio se ocupó en ${MAX_BOOKING_ATTEMPTS} intentos seguidos antes de mostrar el formulario.`,
        );
      }
      await page.goto("/reservar");
      continue;
    }
    if (selection.outcome !== "ready" || !selection.time) {
      throw new Error(`No se pudo elegir un espacio: ${selection.outcome}`);
    }

    await page
      .getByRole("textbox", { name: "Tu nombre", exact: true })
      .fill(CUSTOMER_NAME);
    await page
      .getByRole("textbox", { name: "Teléfono", exact: true })
      .fill(phone);

    if (mobile) {
      await expectNoHorizontalOverflow(page);
    }

    const outcome = await submitBooking(page);
    if (outcome === "booked") {
      await expect(
        page.getByRole("heading", {
          name: "Tu cita está confirmada",
          exact: true,
        }),
      ).toBeVisible({ timeout: EXPECT_TIMEOUT });
      await expect(page.getByText("Confirmada", { exact: true })).toBeVisible();

      const appointmentCard = page
        .locator("article")
        .filter({ hasText: "Fecha y hora" });
      await expect(appointmentCard).toBeVisible();
      await expect(appointmentCard).toContainText(selection.time);
      await expect(appointmentCard).toContainText("Corte · 30 min · ₡6.000");
      await expect(appointmentCard).toContainText(CUSTOMER_NAME);
      await expect(
        page.getByRole("link", {
          name: `+506 ${phone.slice(0, 4)} ${phone.slice(4)}`,
          exact: true,
        }),
      ).toHaveAttribute("href", `tel:+506${phone}`);

      if (mobile) {
        await expectNoHorizontalOverflow(page);
      }
      return;
    }

    if (outcome !== "taken") {
      throw new Error(`La reserva no se completó: ${outcome}`);
    }
    if (attempt === MAX_BOOKING_ATTEMPTS) {
      throw new Error(
        `El espacio se ocupó en ${MAX_BOOKING_ATTEMPTS} intentos seguidos al enviar el formulario.`,
      );
    }

    await page.goto("/reservar");
  }
}

async function cancelAppointment(page: Page, mobile: boolean): Promise<void> {
  await page
    .getByRole("button", { name: "Cancelar cita", exact: true })
    .click();
  await expect(
    page.getByText("¿Seguro? La cita se libera para otra persona.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sí, cancelar", exact: true }).click();

  await expect(
    page.getByRole("heading", {
      name: "Esta cita está cancelada",
      exact: true,
    }),
  ).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancelar cita", exact: true }),
  ).toHaveCount(0);

  // Una recarga confirma que el cambio quedó persistido, no solo en la acción.
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Esta cita está cancelada",
      exact: true,
    }),
  ).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();

  if (mobile) {
    await expectNoHorizontalOverflow(page);
  }
}

async function runPublicBookingFlow(
  page: Page,
  { mobile = false }: { mobile?: boolean } = {},
): Promise<void> {
  const phone = uniqueCostaRicaPhone();
  expect(phone).toMatch(/^[678]\d{7}$/);

  await page.goto("/");
  await expectLanding(page);
  if (mobile) {
    expect(page.viewportSize()?.width).toBe(360);
    await expectNoHorizontalOverflow(page);
  }

  await page
    .getByRole("link", { name: "Reservar mi cita", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reservar$/);
  await expect(
    page.getByRole("heading", { name: "Elige día y hora", exact: true }),
  ).toBeVisible({ timeout: EXPECT_TIMEOUT });

  await bookAppointment(page, phone, mobile);
  await cancelAppointment(page, mobile);
}

test("flujo público completo: landing, reserva, confirmación y cancelación", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await runPublicBookingFlow(page);
});

test.describe("viewport móvil de 360 px", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("el flujo público completo es usable y no desborda horizontalmente", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await runPublicBookingFlow(page, { mobile: true });
  });
});
