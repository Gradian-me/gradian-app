'use client';

import React, { createContext } from 'react';
import type { FormContextType } from '../types/form-schema';

export const FormContext = createContext<FormContextType | null>(null);
