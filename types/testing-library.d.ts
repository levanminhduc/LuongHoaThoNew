declare module "@testing-library/react" {
  import type { ReactElement } from "react";
  import type { RenderOptions, RenderResult } from "@testing-library/react";

  export function render(
    ui: ReactElement,
    options?: RenderOptions
  ): RenderResult;

  export const screen: {
    getByText: (text: string | RegExp) => HTMLElement;
    getByRole: (role: string, options?: Record<string, unknown>) => HTMLElement;
    getByLabelText: (text: string | RegExp) => HTMLElement;
    getByPlaceholderText: (text: string | RegExp) => HTMLElement;
    getByTestId: (testId: string) => HTMLElement;
    queryByText: (text: string | RegExp) => HTMLElement | null;
    queryByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => HTMLElement | null;
    queryByLabelText: (text: string | RegExp) => HTMLElement | null;
    queryByPlaceholderText: (text: string | RegExp) => HTMLElement | null;
    queryByTestId: (testId: string) => HTMLElement | null;
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    findByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => Promise<HTMLElement>;
    findByLabelText: (text: string | RegExp) => Promise<HTMLElement>;
    findByPlaceholderText: (text: string | RegExp) => Promise<HTMLElement>;
    findByTestId: (testId: string) => Promise<HTMLElement>;
    getAllByText: (text: string | RegExp) => HTMLElement[];
    getAllByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => HTMLElement[];
    getAllByLabelText: (text: string | RegExp) => HTMLElement[];
    getAllByPlaceholderText: (text: string | RegExp) => HTMLElement[];
    getAllByTestId: (testId: string) => HTMLElement[];
    queryAllByText: (text: string | RegExp) => HTMLElement[];
    queryAllByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => HTMLElement[];
    queryAllByLabelText: (text: string | RegExp) => HTMLElement[];
    queryAllByPlaceholderText: (text: string | RegExp) => HTMLElement[];
    queryAllByTestId: (testId: string) => HTMLElement[];
    findAllByText: (text: string | RegExp) => Promise<HTMLElement[]>;
    findAllByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => Promise<HTMLElement[]>;
    findAllByLabelText: (text: string | RegExp) => Promise<HTMLElement[]>;
    findAllByPlaceholderText: (text: string | RegExp) => Promise<HTMLElement[]>;
    findAllByTestId: (testId: string) => Promise<HTMLElement[]>;
    debug: (element?: HTMLElement) => void;
  };

  export function cleanup(): void;
  export function waitFor<T>(
    callback: () => T | Promise<T>,
    options?: { timeout?: number; interval?: number }
  ): Promise<T>;
  export function act(callback: () => void | Promise<void>): Promise<void>;
  export function fireEvent(
    element: HTMLElement,
    event: Event
  ): boolean;

  export namespace fireEvent {
    function click(element: HTMLElement): boolean;
    function change(
      element: HTMLElement,
      options?: { target: { value: string } }
    ): boolean;
    function submit(element: HTMLElement): boolean;
    function focus(element: HTMLElement): boolean;
    function blur(element: HTMLElement): boolean;
    function keyDown(
      element: HTMLElement,
      options?: { key: string; code?: string }
    ): boolean;
    function keyUp(
      element: HTMLElement,
      options?: { key: string; code?: string }
    ): boolean;
    function keyPress(
      element: HTMLElement,
      options?: { key: string; code?: string }
    ): boolean;
    function mouseEnter(element: HTMLElement): boolean;
    function mouseLeave(element: HTMLElement): boolean;
    function mouseOver(element: HTMLElement): boolean;
    function mouseOut(element: HTMLElement): boolean;
  }

  export interface RenderOptions {
    container?: HTMLElement;
    baseElement?: HTMLElement;
    hydrate?: boolean;
    wrapper?: React.ComponentType;
  }

  export interface RenderResult {
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (element?: HTMLElement) => void;
    rerender: (ui: ReactElement) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
    getByText: (text: string | RegExp) => HTMLElement;
    getByRole: (role: string, options?: Record<string, unknown>) => HTMLElement;
    getByLabelText: (text: string | RegExp) => HTMLElement;
    getByPlaceholderText: (text: string | RegExp) => HTMLElement;
    getByTestId: (testId: string) => HTMLElement;
    queryByText: (text: string | RegExp) => HTMLElement | null;
    queryByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => HTMLElement | null;
    queryByLabelText: (text: string | RegExp) => HTMLElement | null;
    queryByPlaceholderText: (text: string | RegExp) => HTMLElement | null;
    queryByTestId: (testId: string) => HTMLElement | null;
    findByText: (text: string | RegExp) => Promise<HTMLElement>;
    findByRole: (
      role: string,
      options?: Record<string, unknown>
    ) => Promise<HTMLElement>;
    findByLabelText: (text: string | RegExp) => Promise<HTMLElement>;
    findByPlaceholderText: (text: string | RegExp) => Promise<HTMLElement>;
    findByTestId: (testId: string) => Promise<HTMLElement>;
  }
}
