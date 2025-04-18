import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './App.css';
import { FaSearch } from 'react-icons/fa';
import { useTheme } from './ThemeContext';

interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  genre_ids?: number[];
  media_type?: string;
  backdrop_path?: string;
}

interface Genre {
  id: number;
  name: string;
}

interface SearchSuggestion {
  id: number;
  title: string;
}

const API_KEY = import.meta.env.VITE_API_KEY;

const FavoritesSection: React.FC<{ genres: Genre[] }> = ({ genres }) => {
  const [favorites, setFavorites] = useState<Movie[]>([]);

  useEffect(() => {
    const fetchFavorites = async () => {
      const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (favoriteIds.length === 0) return;

      try {
        const favoriteMovies = await Promise.all(
          favoriteIds.map(async (id: number) => {
            try {
              const response = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
                params: { api_key: API_KEY, language: 'ru-RU' },
              });
              return response.data;
            } catch (err) {
              console.warn(`Ошибка при загрузке фильма с ID ${id}:`, err);
              return null; 
            }
          })
        );

        setFavorites(favoriteMovies.filter((movie): movie is Movie => movie !== null && movie.title && movie.poster_path));
      } catch (err) {
        console.error('Ошибка при загрузке избранных фильмов:', err);
      }
    };

    fetchFavorites();
  }, []);

  if (favorites.length === 0) return null;

  const getGenreNames = (ids?: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return 'Жанры отсутствуют';
    }
    return ids
      .map((id) => genres.find((genre) => genre.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Жанры отсутствуют';
  };

  return (
    <div className="favorites-section">
      <h2>Ваше избранное</h2>
      <div className="movie-list">
        {favorites.map((movie) => (
          <div key={movie.id} className="movie-card">
            <div className="movie-poster">
              <img
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title}
              />
              <div className="movie-overlay-content">
                <Link to={`/Item/movie/${movie.id}`} className="movie-link">
                  Смотреть
                </Link>
              </div>
            </div>
            <h3>{movie.title}</h3>
            <p className="movie-overview">{movie.overview?.slice(0, 80) || 'Описание отсутствует'}...</p>
            <p className="movie-genres">
              <strong>Жанры:</strong> {getGenreNames(movie.genre_ids)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesResponse, genresResponse, featuredResponse, topMoviesResponse] = await Promise.all([
          axios.get('https://api.themoviedb.org/3/movie/popular', {
            params: { api_key: API_KEY, language: 'ru-RU', page: 1 },
          }),
          axios.get('https://api.themoviedb.org/3/genre/movie/list', {
            params: { api_key: API_KEY, language: 'ru-RU' },
          }),
          axios.get('https://api.themoviedb.org/3/movie/now_playing', {
            params: { api_key: API_KEY, language: 'ru-RU', page: 1 },
          }),
          axios.get('https://api.themoviedb.org/3/movie/top_rated', {
            params: { api_key: API_KEY, language: 'ru-RU', page: 1 },
          }),
        ]);

        setMovies(moviesResponse.data.results);
        setGenres(genresResponse.data.genres);
        setFeaturedMovies(featuredResponse.data.results.slice(0, 5));
        setBackgroundImages(
          topMoviesResponse.data.results
            .filter((m: any) => m.backdrop_path)
            .map((m: any) => `https://image.tmdb.org/t/p/original${m.backdrop_path}`)
        );
        setLoading(false);
      } catch (err) {
        setError('Ошибка при загрузке данных');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBackgroundIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgroundImages]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSuggestions([]);
      const response = await axios.get('https://api.themoviedb.org/3/movie/popular', {
        params: { api_key: API_KEY, language: 'ru-RU', page: 1 },
      });
      setMovies(response.data.results);
    } else {
      try {
        const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
          params: { api_key: API_KEY, language: 'ru-RU', query: query, page: 1 },
        });
        setMovies(response.data.results);
        setSuggestions(
          response.data.results.slice(0, 5).map((movie: Movie) => ({
            id: movie.id,
            title: movie.title,
          }))
        );
      } catch (err) {
        setError('Ошибка при поиске');
      }
    }
  };

  const handleGenreSelect = async (genreId: number | null) => {
    setSelectedGenre(genreId);
    try {
      const endpoint = genreId ? 'https://api.themoviedb.org/3/discover/movie' : 'https://api.themoviedb.org/3/movie/popular';
      const response = await axios.get(endpoint, {
        params: { api_key: API_KEY, language: 'ru-RU', with_genres: genreId, page: 1 },
      });
      setMovies(response.data.results.slice(0, 50));
    } catch (err) {
      setError('Ошибка при загрузке фильмов');
    }
  };

  const getGenreNames = (ids?: number[]) => {
    if (!Array.isArray(ids) || ids.length === 0) {
      return 'Жанры отсутствуют';
    }
    return ids
      .map((id) => genres.find((genre) => genre.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Жанры отсутствуют';
  };

  const filteredMovies = selectedGenre
    ? movies.filter((movie) => movie.genre_ids?.includes(selectedGenre)).slice(0, 20)
    : movies.slice(0, 20);

  if (loading) {
    return (
      <div className="app-container">
        <div className="hero-overlay">
          <div className="movie-list">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="movie-card skeleton">
                <div className="movie-poster skeleton-poster"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
                <div className="skeleton-text"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) return <div className="error">{error}</div>;

  return (
    <div
      className="app-container"
      style={{
        backgroundImage: backgroundImages[currentBackgroundIndex]
          ? `url(${backgroundImages[currentBackgroundIndex]})`
          : 'none',
      }}
    >
      <div className="hero-overlay">
        <div className="theme-toggle">
          <button onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема'}
          </button>
        </div>
        <h1 className="app-title">КиноВселенная</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Найди свой фильм..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button>
            <FaSearch />
          </button>
          {suggestions.length > 0 && (
            <ul className="search-suggestions">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <Link to={`/Item/movie/${suggestion.id}`} onClick={() => setSearchQuery('')}>
                    {suggestion.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <h2>Выберите жанр</h2>
        <div className="genre-container">
          <button
            className={selectedGenre === null ? 'active' : ''}
            onClick={() => handleGenreSelect(null)}
          >
            Все жанры
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={selectedGenre === genre.id ? 'active' : ''}
              onClick={() => handleGenreSelect(genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>
        <div className="featured-carousel">
          <h2>Сейчас в кино</h2>
          <div className="carousel-track">
            {featuredMovies.map((movie) => (
              <div key={movie.id} className="carousel-item">
                <Link to={`/Item/movie/${movie.id}`}>
                  <img
                    src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
                    alt={movie.title}
                    className="carousel-poster"
                  />
                  <div className="carousel-title">{movie.title}</div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="highlight-section">
          {selectedGenre === null ? (
            <>
              <h3>Добро пожаловать в КиноВселенную!</h3>
              <p>Исследуйте самые популярные фильмы и сериалы всех жанров.</p>
              <p>Выберите жанр для персонализированной подборки шедевров!</p>
            </>
          ) : (
            <>
              <h3>Жанр: {genres.find((genre) => genre.id === selectedGenre)?.name}</h3>
              <p>Погрузитесь в лучшие фильмы этого жанра.</p>
              <p>Каждый фильм — это новая история!</p>
            </>
          )}
        </div>
        <FavoritesSection genres={genres} />
        <div className="movie-list">
          {filteredMovies.length > 0 ? (
            filteredMovies.map((movie, index) => (
              <div key={movie.id} className="movie-card" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="movie-poster">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                  />
                  <div className="movie-overlay-content">
                    <Link to={`/Item/movie/${movie.id}`} className="movie-link">
                      Смотреть
                    </Link>
                  </div>
                </div>
                <h3>{movie.title}</h3>
                <p className="movie-overview">{movie.overview?.slice(0, 80) || 'Описание отсутствует'}...</p>
                <p className="movie-genres">
                  <strong>Жанры:</strong> {getGenreNames(movie.genre_ids)}
                </p>
              </div>
            ))
          ) : (
            <div className="error">Фильмы скоро появятся!</div>
          )}
        </div>
        <div className="highlight-section tip-section">
          <h3>Совет дня</h3>
          <p>
            Не знаете, что выбрать? Попробуйте жанр, который вы еще не смотрели — вас ждет открытие!
          </p>
        </div>
        <div className="highlight-section feature-section">
          <h3>Наша фишка</h3>
          <p>
            КиноВселенная — это твой гид по миру кино. Ежедневные обновления, уникальные подборки и поиск по твоим вкусам!
          </p>
        </div>
        <footer>
          <p>
            Powered by{' '}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
              TMDB
            </a>
          </p>
          <div className="social-links">
            <a href="#" className="social-icon">
              🎥
            </a>
            <a href="#" className="social-icon">
              🎬
            </a>
            <a href="#" className="social-icon">
              📽️
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;