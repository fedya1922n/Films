import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import './Item.css';

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  genres: { id: number; name: string }[];
  vote_average?: number;
  release_date?: string;
  trailerKey?: string;
  backdrop_path?: string;
}

interface SimilarMovie {
  id: number;
  title: string;
  poster_path: string;
}

const Item: React.FC = () => {
  const { mediaType, movieId } = useParams<{ mediaType: string; movieId: string }>();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [watchProviders, setWatchProviders] = useState<any[] | null>(null);
  const [similarMovies, setSimilarMovies] = useState<SimilarMovie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const API_KEY = import.meta.env.VITE_API_KEY as string;
  const API_URL = `https://api.themoviedb.org/3/${mediaType}/${movieId}?api_key=${API_KEY}&language=ru-RU`;

  useEffect(() => {
    if (movieId) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.includes(Number(movieId)));
    }
  }, [movieId]);

  const fetchTrailer = async (): Promise<string | null> => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/${mediaType}/${movieId}/videos?api_key=${API_KEY}&language=ru-RU`
      );
      const trailer = response.data.results.find((video: any) => video.type === 'Trailer')?.key || null;
      return trailer;
    } catch (err) {
      console.error('Ошибка при загрузке трейлера:', err);
      return null;
    }
  };

  const fetchWatchProviders = async (): Promise<any[] | null> => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/${mediaType}/${movieId}/watch/providers?api_key=${API_KEY}`
      );
      return response.data.results.RU?.flatrate || null;
    } catch (err) {
      console.error('Ошибка при загрузке платформ:', err);
      return null;
    }
  };

  const fetchSimilarMovies = async (genres: { id: number; name: string }[]): Promise<SimilarMovie[]> => {
    try {
      const genreIds = genres.map((genre) => genre.id).join(',');
      const response = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        params: {
          api_key: API_KEY,
          language: 'ru-RU',
          with_genres: genreIds,
          page: 1,
          sort_by: 'popularity.desc',
        },
      });
      return response.data.results
        .filter((m: any) => m.id !== Number(movieId) && m.poster_path)
        .slice(0, 30)
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          poster_path: m.poster_path,
        }));
    } catch (err) {
      console.error('Ошибка при загрузке похожих фильмов:', err);
      return [];
    }
  };

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!mediaType || !movieId) {
        setError('Некорректные параметры URL.');
        setLoading(false);
        return;
      }

      try {
        const [movieResponse, trailerKey, providers] = await Promise.all([
          axios.get(API_URL),
          fetchTrailer(),
          fetchWatchProviders(),
        ]);
        setMovie({ ...movieResponse.data, trailerKey });
        setWatchProviders(providers);

        const similar = await fetchSimilarMovies(movieResponse.data.genres);
        setSimilarMovies(similar);

        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке данных о фильме:', err);
        setError('Ошибка при загрузке данных о фильме.');
        setLoading(false);
      }
    };

    fetchMovieDetails();
  }, [API_URL, mediaType, movieId]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      const updatedFavorites = favorites.filter((id: number) => id !== Number(movieId));
      localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      setIsFavorite(false);
    } else {
      favorites.push(Number(movieId));
      localStorage.setItem('favorites', JSON.stringify(favorites));
      setIsFavorite(true);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <p className="error">{error}</p>;
  if (!movie) return <p className="error">Нет данных для отображения</p>;

  return (
    <div
      className="movie-details"
      style={{
        backgroundImage: movie.backdrop_path
          ? `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`
          : 'none',
      }}
    >
      <div className="movie-overlay">
        <nav className="breadcrumbs">
          <Link to="/" className="breadcrumb-link">
            Главная
          </Link>
          <span className="breadcrumb-divider">/</span>
          <Link to="/" className="breadcrumb-link">
            Фильмы
          </Link>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current">{movie.title}</span>
        </nav>
        <div className="movie-header">
          <Link to="/" className="back-button">
            Назад
          </Link>
          <button
            className={`favorite-button ${isFavorite ? 'active' : ''}`}
            onClick={toggleFavorite}
          >
            <FaHeart />
          </button>
        </div>
        <h1 className="movie-title">{movie.title}</h1>
        <div className="movie-content">
          <div className="movie-poster">
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              className="poster-img"
            />
          </div>
          <div className="movie-info">
            <p className="movie-overview">{movie.overview || 'Описание отсутствует'}</p>
            <p className="movie-genres">
              <strong>Жанры:</strong> {movie.genres.map((g) => g.name).join(', ')}
            </p>
            {movie.vote_average !== undefined && movie.vote_average > 0 ? (
  <p className="movie-rating">
    <strong>Рейтинг:</strong>{' '}
    <span className="rating-stars">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={i < Math.round(movie.vote_average! / 2) ? 'star filled' : 'star'}
        >
          ★
        </span>
      ))}
    </span>{' '}
    ({movie.vote_average.toFixed(1)})
  </p>
) : (
  <p className="movie-rating"><strong>Рейтинг:</strong> Отсутствует</p>
)}
            {movie.release_date && (
              <p className="movie-release">
                <strong>Дата выпуска:</strong> {movie.release_date}
              </p>
            )}
            {watchProviders && watchProviders.length > 0 ? (
              <div className="movie-providers">
                <h3>Смотреть на:</h3>
                <div className="providers-list">
                  {watchProviders.map((provider) => (
                    <span key={provider.provider_id} className="provider-item">
                      {provider.provider_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="movie-providers">Информация о стриминге недоступна</p>
            )}
          </div>
        </div>
        {movie.trailerKey ? (
          <div className="movie-trailer">
            <h3>Трейлер</h3>
            <div className="trailer-wrapper">
              <video
                className="trailer-video"
                poster={`https://img.youtube.com/vi/${movie.trailerKey}/hqdefault.jpg`}
                muted
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => e.currentTarget.pause()}
              >
                <source src={`https://www.youtube.com/watch?v=${movie.trailerKey}`} type="video/mp4" />
              </video>
              <Link
                to={`https://www.youtube.com/watch?v=${movie.trailerKey}`}
                target="_blank"
                className="trailer-play-button"
              >
                ▶ Воспроизвести
              </Link>
            </div>
          </div>
        ) : (
          <p className="movie-trailer">Трейлер недоступен</p>
        )}
        {similarMovies.length > 0 && (
          <div className="similar-movies">
            <h3>Похожие фильмы</h3>
            <div className="similar-movies-slider">
              {similarMovies.map((similarMovie) => (
                <div key={similarMovie.id} className="similar-movie-card">
                  <Link to={`/Item/movie/${similarMovie.id}`}>
                    <img
                      src={`https://image.tmdb.org/t/p/w200${similarMovie.poster_path}`}
                      alt={similarMovie.title}
                      className="similar-movie-poster"
                    />
                    <p className="similar-movie-title">{similarMovie.title}</p>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Item;