defmodule Farmbot.Sync do
  @moduledoc """
    There is a quite a bit of macros going on here.
      * `defdatabase` comes from `Amnesia`
        * defindes a database. This should only show up once.
      * `generate` comes from `Farmbot.Sync.Macros`
        * Should happen once for every syncable object from the api.
        * Needs to be given all the wanted keys that will exist from the api
      * `mutation` comes from `Syncable`
        * takes a key that exists in `generate module`
        * given the variable `before` one can create a new value with that.
        * must return {:ok, new_thing}
  """
  use Amnesia
  import Syncable

  defdatabase Database do
    @moduledoc """
      The Database that holds all the objects found on the Farmbot Web Api
    """

    # Syncables
    syncable Device, [:id, :planting_area_id, :name, :webcam_url]
    syncable Peripheral,
      [:id, :device_id, :pin, :mode, :label, :created_at, :updated_at]
    syncable Regimen, [:id, :color, :name, :device_id]
    syncable RegimenItem, [ :id, :time_offset, :regimen_id, :sequence_id]
    syncable Sequence, [:args, :body, :color, :device_id, :id, :kind, :name]
    syncable ToolBay, [:id, :device_id, :name]
    syncable ToolSlot, [:id, :tool_bay_id, :name, :x, :y, :z]
    syncable Tool, [:id, :slot_id, :name]
    syncable User, [ :id, :device_id, :name, :email, :created_at, :updated_at]
  end
  get_by_id("device")
  get_by_id("peripheral")
  get_by_id("regimen_item")
  get_by_id("regimen")
  get_by_id("sequence")
  get_by_id("tool_bay")
  get_by_id("tool_slot")
  get_by_id("tool")
  get_by_id("user")

  @doc """
    Downloads the sync object form the API.
  """
  def sync do
    with {:ok, json_token}  <- fetch_token,
         {:ok, token}       <- Token.create(json_token),
         {:ok, server}      <- fetch_server,
         {:ok, resp}        <- fetch_sync_object(server, token),
         {:ok, json}        <- parse_http(resp),
         {:ok, parsed}      <- Poison.decode(json),
         do: parsed
  end
  @doc """
    Gets a token from Farmbot.Auth
  """
  def fetch_token do
    case Farmbot.Auth.get_token do
      nil -> {:error, :no_token}
      {:error, reason} -> {:error, reason}
      json_token -> {:ok, json_token}
    end
  end

  def fetch_server do
    case Farmbot.BotState.get_server do
      nil -> {:error, :no_server}
      {:error, reason} -> {:error, reason}
      server -> {:ok, server}
    end
  end

  @doc """
    Tries to do an HTTP request on server/api/sync
  """
  @spec fetch_sync_object(nil | String.t, Token.t | any)
  :: {:error, atom} | {:ok, HTTPotion.Response.t | HTTPotion.ErrorResponse.t}
  def fetch_sync_object(nil, _), do: {:error, :bad_server}
  def fetch_sync_object(server, %Token{} = token) do
    headers =
      ["Content-Type": "application/json",
       "Authorization": "Bearer " <> token.encoded]
    {:ok, HTTPotion.get("#{server}/api/sync", [headers: headers])}
  end
  def fetch_sync_object(_server, _token), do: {:error, :bad_token}

  @doc """
    Parses HTTPotion responses
  """
  @spec parse_http(HTTPotion.Response.t | HTTPotion.ErrorResponse.t)
  :: {:ok, map} | {:error, atom}
  def parse_http(%HTTPotion.ErrorResponse{message: m}), do: {:error, m}
  def parse_http(%HTTPotion.Response{body: b, headers: _headers, status_code: 200}) do
    {:ok, b}
  end
  def parse_http(error), do: {:error, error}
end
