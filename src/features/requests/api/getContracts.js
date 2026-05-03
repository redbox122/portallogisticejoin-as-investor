// src/features/requests/api/getContracts.js
import api from '../../../lib/api';

export async function getRentalContracts() {
  const { data } = await api.get('/contracts/approved-rental');
  return data.data || [];
}