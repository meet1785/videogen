"""Database service for task persistence."""
import logging
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.database import Base, Task
from app.config import settings

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service for managing database operations."""
    
    def __init__(self, database_url: str = None):
        """Initialize database service."""
        if database_url is None:
            # Default to SQLite in the output directory
            database_url = f"sqlite+aiosqlite:///{settings.output_dir}/tasks.db"
        
        # Create async engine
        self.engine = create_async_engine(
            database_url,
            echo=False,
            connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
            poolclass=StaticPool if "sqlite" in database_url else None,
        )
        
        # Create async session maker
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        logger.info(f"DatabaseService initialized with URL: {database_url}")
    
    async def init_db(self):
        """Initialize database tables."""
        try:
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    async def create_task(
        self,
        task_id: str,
        prompt: str,
        negative_prompt: Optional[str],
        platform: str,
        width: int,
        height: int,
        fps: int,
        duration: int,
        seed: Optional[int],
        num_inference_steps: int,
        guidance_scale: float
    ) -> Task:
        """Create a new task in the database."""
        async with self.async_session() as session:
            task = Task(
                id=task_id,
                status="pending",
                progress=0,
                message="Task created",
                prompt=prompt,
                negative_prompt=negative_prompt,
                platform=platform,
                width=width,
                height=height,
                fps=fps,
                duration=duration,
                seed=seed,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                created_at=datetime.now(timezone.utc)
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)
            logger.info(f"Created task {task_id} in database")
            return task
    
    async def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        async with self.async_session() as session:
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            return task
    
    async def update_task(
        self,
        task_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        video_url: Optional[str] = None,
        video_path: Optional[str] = None,
        error: Optional[str] = None,
        completed: bool = False
    ) -> Optional[Task]:
        """Update a task in the database."""
        async with self.async_session() as session:
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if task is None:
                return None
            
            if status is not None:
                task.status = status
            if progress is not None:
                task.progress = progress
            if message is not None:
                task.message = message
            if video_url is not None:
                task.video_url = video_url
            if video_path is not None:
                task.video_path = video_path
            if error is not None:
                task.error = error
            if completed:
                task.completed_at = datetime.now(timezone.utc)
            
            await session.commit()
            await session.refresh(task)
            logger.debug(f"Updated task {task_id}")
            return task
    
    async def list_tasks(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Task]:
        """List tasks with optional filtering."""
        async with self.async_session() as session:
            query = select(Task).order_by(Task.created_at.desc())
            
            if status:
                query = query.where(Task.status == status)
            
            query = query.limit(limit).offset(offset)
            
            result = await session.execute(query)
            tasks = result.scalars().all()
            return list(tasks)
    
    async def delete_old_tasks(self, days: int = 7) -> int:
        """Delete tasks older than specified days."""
        async with self.async_session() as session:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Get tasks to delete
            result = await session.execute(
                select(Task).where(
                    and_(
                        Task.completed_at < cutoff_date,
                        or_(Task.status == "completed", Task.status == "failed")
                    )
                )
            )
            tasks = result.scalars().all()
            
            # Delete tasks
            for task in tasks:
                await session.delete(task)
            
            await session.commit()
            count = len(tasks)
            logger.info(f"Deleted {count} old tasks")
            return count
    
    async def get_task_count(self, status: Optional[str] = None) -> int:
        """Get count of tasks."""
        async with self.async_session() as session:
            query = select(func.count()).select_from(Task)
            if status:
                query = query.where(Task.status == status)
            
            result = await session.execute(query)
            count = result.scalar()
            return count if count else 0
    
    async def close(self):
        """Close database connection."""
        await self.engine.dispose()
        logger.info("Database connection closed")


# Global database service instance
db_service = DatabaseService()
