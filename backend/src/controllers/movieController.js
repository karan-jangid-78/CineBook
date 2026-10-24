import { Movie } from '../models/Movie.js';
import { Show } from '../models/Show.js';

export async function getMovies(req, res, next) {
  try {
    const { genre, search, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (genre && genre !== 'All') {
      query.genre = genre;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const movies = await Movie.find(query).sort({ featured: -1, rating: -1, releaseDate: -1 });

    // Distinct genres for filter pills
    const allGenres = await Movie.distinct('genre');

    res.status(200).json({
      success: true,
      count: movies.length,
      genres: allGenres,
      data: movies,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMovieById(req, res, next) {
  try {
    const { id } = req.params;
    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found',
      });
    }

    // Fetch active shows for this movie
    const shows = await Show.find({
      movie: id,
      isActive: true,
      startTime: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // shows within past 30 mins onwards
    })
      .populate('cinema')
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: {
        movie,
        shows,
      },
    });
  } catch (err) {
    next(err);
  }
}
