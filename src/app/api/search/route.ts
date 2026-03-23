import { NextRequest } from 'next/server';
import { SearchService } from '@/lib/services/search.service';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

const DEFAULT_USER_ID = 'default-user';

export async function GET(request: NextRequest) {
  try {
    const service = new SearchService();
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('query') || searchParams.get('q') || '';
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined;

    const results = service.search(DEFAULT_USER_ID, query, { limit, offset });
    return successResponse(results);
  } catch (error) {
    return errorResponse(error);
  }
}
