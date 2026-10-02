import { HttpErrorResponse } from '@angular/common/http';

export function recurrenceRequestError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 401:
        return 'Sua sessão expirou. Entre novamente para continuar.';
      case 403:
        return 'Você não tem permissão para alterar este item.';
      case 404:
        return 'Este item não está mais disponível. Atualize a página.';
      case 409:
        return 'Uma das datas coincide com outro compromisso. Ajuste o horário ou o período da repetição.';
      case 400:
      case 422:
        return 'Revise as datas e a frequência. Use até 1.000 ocorrências em um período de até 10 anos.';
    }
  }
  return 'Não foi possível salvar. Seus dados foram mantidos no formulário. Tente novamente.';
}
