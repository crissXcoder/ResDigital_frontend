import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SelectorAnimalReporte } from "@/components/reportes/selector-animal-reporte";
import type { Animal } from "@/lib/api/animales";

const mockDescargarExpediente = vi.fn(
  async (_animalId?: string, _nombreFinca?: string) => {},
);

vi.mock("@/lib/reportes/expediente-pdf", () => ({
  descargarExpedientePdfPorId: (...args: [string, (string | undefined)?]) =>
    mockDescargarExpediente(...args),
}));

const mockAnimales: Animal[] = [
  {
    id: "animal-1",
    tenantId: "tenant-1",
    areteInterno: "101",
    nombre: "Lola",
    numeroOficialDiio: "CR-100200",
    sexo: "Hembra",
    categoria: "Vaca en Ordeño",
    razaId: "raza-1",
    activo: true,
  },
  {
    id: "animal-2",
    tenantId: "tenant-1",
    areteInterno: "102",
    nombre: "Manchas",
    numeroOficialDiio: undefined,
    sexo: "Hembra",
    categoria: "Vaca Seca",
    razaId: "raza-1",
    activo: true,
  },
  {
    id: "animal-3",
    tenantId: "tenant-1",
    areteInterno: "103",
    nombre: "Toro Max",
    numeroOficialDiio: "CR-999888",
    sexo: "Macho",
    categoria: "Semental/Reproductor",
    razaId: "raza-2",
    activo: true,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SelectorAnimalReporte (Hatos Extensos UX & Descarga Directa)", () => {
  it("renderiza el input de búsqueda accesible para hatos extensos", () => {
    render(<SelectorAnimalReporte animales={mockAnimales} />);

    const input = screen.getByLabelText(/buscar animal por arete/i);
    expect(input).toBeDefined();
    expect(input.getAttribute("placeholder")).toContain("Buscar por arete");
  });

  it("filtra en tiempo real por número de arete al escribir", () => {
    render(<SelectorAnimalReporte animales={mockAnimales} />);

    const input = screen.getByLabelText(/buscar animal por arete/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "103" } });

    expect(screen.getByText("Toro Max")).toBeDefined();
    expect(screen.queryByText("Lola")).toBeNull();
    expect(screen.queryByText("Manchas")).toBeNull();
  });

  it("filtra en tiempo real por DIIO oficial", () => {
    render(<SelectorAnimalReporte animales={mockAnimales} />);

    const input = screen.getByLabelText(/buscar animal por arete/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100200" } });

    expect(screen.getByText("Lola")).toBeDefined();
    expect(screen.queryByText("Toro Max")).toBeNull();
  });

  it("permite descargar directamente el PDF del expediente desde el centro de reportes sin redirigir", async () => {
    const onSelect = vi.fn();
    render(
      <SelectorAnimalReporte
        animales={mockAnimales}
        nombreFinca="Hacienda El Progreso"
        onSelectAnimal={onSelect}
      />,
    );

    const input = screen.getByLabelText(/buscar animal por arete/i);
    fireEvent.focus(input);

    const lolaOption = screen.getByRole("button", { name: /#101.*Lola/i });
    fireEvent.click(lolaOption);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "animal-1", nombre: "Lola" }),
    );

    // Debe mostrar botón de descarga directa de PDF
    const downloadBtn = screen.getByRole("button", { name: /descargar expediente pdf/i });
    expect(downloadBtn).toBeDefined();

    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockDescargarExpediente).toHaveBeenCalledWith("animal-1", "Hacienda El Progreso");
    });

    // Enlace complementario para ir al hato si el usuario lo desea
    const link = screen.getByRole("link", { name: /ver en hato/i });
    expect(link.getAttribute("href")).toBe("/hato/animal-1");
  });

  it("muestra un mensaje de error visible si la descarga del PDF falla (RF-027)", async () => {
    mockDescargarExpediente.mockRejectedValueOnce(new Error("Network error"));

    render(
      <SelectorAnimalReporte animales={mockAnimales} nombreFinca="Hacienda El Progreso" />,
    );

    const input = screen.getByLabelText(/buscar animal por arete/i);
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("button", { name: /#101.*Lola/i }));

    const downloadBtn = screen.getByRole("button", { name: /descargar expediente pdf/i });
    fireEvent.click(downloadBtn);

    expect(
      await screen.findByText(
        "No se pudo generar el PDF del expediente. Verifica tu conexión e intenta de nuevo.",
      ),
    ).toBeDefined();

    // El botón vuelve a estar habilitado y usable, no queda inerte
    expect(downloadBtn.hasAttribute("disabled")).toBe(false);
  });

  it("limita la visualización y maneja hatos grandes (>50 animales) sin saturar el DOM", () => {
    const hatoGrande: Animal[] = Array.from({ length: 150 }, (_, i) => ({
      id: `animal-${i}`,
      tenantId: "tenant-1",
      areteInterno: `${1000 + i}`,
      nombre: `Vaca ${i}`,
      sexo: "Hembra",
      categoria: "Vaca",
      razaId: "raza-1",
      activo: true,
    }));

    render(<SelectorAnimalReporte animales={hatoGrande} />);

    const input = screen.getByLabelText(/buscar animal por arete/i);
    fireEvent.focus(input);

    expect(screen.getByText(/150 animales encontrados/i)).toBeDefined();
    expect(screen.getByText(/Mostrando primeros 50/i)).toBeDefined();
  });
});
