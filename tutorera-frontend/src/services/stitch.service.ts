// Google Stitch Data Integration Service
import axios, { AxiosInstance } from 'axios';

interface StitchConfig {
  apiKey: string;
  baseUrl: string;
}

interface DataModel {
  id: string;
  type: 'tutors' | 'students' | 'bookings' | 'offers';
  data: Record<string, any>;
  timestamp: Date;
}

class StitchService {
  private client: AxiosInstance;
  private config: StitchConfig;

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      baseUrl: 'https://stitch.googleapis.com/mcp',
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'X-Goog-Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Sync tutors data
  async syncTutors(tutors: any[]): Promise<void> {
    try {
      await this.client.post('/sync', {
        model: 'tutors',
        data: tutors.map(t => ({
          id: t._id,
          name: t.name,
          specializations: t.specializations,
          rating: t.rating,
          availability: t.availability,
          hourlyRate: t.hourlyRate,
          verified: t.verified,
          timestamp: new Date(),
        })),
      });
    } catch (error) {
      console.error('Failed to sync tutors:', error);
      throw error;
    }
  }

  // Sync student data
  async syncStudent(student: any): Promise<void> {
    try {
      await this.client.post('/sync', {
        model: 'students',
        data: [{
          id: student._id,
          name: student.name,
          email: student.email,
          subjects: student.subjects,
          level: student.level,
          progress: student.progress,
          bookings: student.bookings,
          timestamp: new Date(),
        }],
      });
    } catch (error) {
      console.error('Failed to sync student:', error);
      throw error;
    }
  }

  // Sync bookings
  async syncBookings(bookings: any[]): Promise<void> {
    try {
      await this.client.post('/sync', {
        model: 'bookings',
        data: bookings.map(b => ({
          id: b._id,
          tutorId: b.tutor,
          studentId: b.student,
          startTime: b.startTime,
          endTime: b.endTime,
          subject: b.subject,
          status: b.status,
          rating: b.rating,
          amount: b.amount,
          timestamp: new Date(),
        })),
      });
    } catch (error) {
      console.error('Failed to sync bookings:', error);
      throw error;
    }
  }

  // Sync offers
  async syncOffers(offers: any[]): Promise<void> {
    try {
      await this.client.post('/sync', {
        model: 'offers',
        data: offers.map(o => ({
          id: o._id,
          tutorId: o.tutor,
          requestId: o.request,
          bidAmount: o.bidAmount,
          message: o.message,
          status: o.status,
          createdAt: o.createdAt,
          timestamp: new Date(),
        })),
      });
    } catch (error) {
      console.error('Failed to sync offers:', error);
      throw error;
    }
  }

  // Fetch tutors from Stitch
  async getTutors(filters?: Record<string, any>): Promise<any[]> {
    try {
      const response = await this.client.get('/query', {
        params: { model: 'tutors', ...filters },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch tutors:', error);
      return [];
    }
  }

  // Fetch bookings from Stitch
  async getBookings(studentId: string): Promise<any[]> {
    try {
      const response = await this.client.get('/query', {
        params: { model: 'bookings', studentId },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return [];
    }
  }

  // Fetch offers from Stitch
  async getOffers(tutorId: string): Promise<any[]> {
    try {
      const response = await this.client.get('/query', {
        params: { model: 'offers', tutorId },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch offers:', error);
      return [];
    }
  }

  // Real-time sync listener
  async watchModel(model: string, callback: (data: DataModel) => void): Promise<void> {
    try {
      const eventSource = new EventSource(
        `${this.config.baseUrl}/watch?model=${model}&key=${this.config.apiKey}`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
      };

      eventSource.onerror = (error) => {
        console.error('Stitch watch error:', error);
        eventSource.close();
      };
    } catch (error) {
      console.error('Failed to watch model:', error);
    }
  }

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Stitch health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let stitchService: StitchService | null = null;

export function initializeStitch(apiKey: string): StitchService {
  stitchService = new StitchService(apiKey);
  return stitchService;
}

export function getStitchService(): StitchService {
  if (!stitchService) {
    throw new Error('Stitch service not initialized. Call initializeStitch first.');
  }
  return stitchService;
}

export default StitchService;
